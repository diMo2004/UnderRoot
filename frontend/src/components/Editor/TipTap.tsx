"use client";
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Document from '@tiptap/extension-document';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Highlight from '@tiptap/extension-highlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Citation } from './extensions/Citation';
import { Chart } from './extensions/Chart';
import { InlineMath, MathBlock } from './extensions/Math';
import { Page } from './extensions/Page';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';

/* ─── A4 Page Constants (96 DPI) ─── */
const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1123;
const PAGE_PADDING = 96;

const CustomDocument = Document.extend({
  content: 'page+',
});

const ExtendedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: '100%', renderHTML: (a: any) => ({ width: a.width }) },
      rotate: { default: 0, renderHTML: (a: any) => ({ style: `transform: rotate(${a.rotate}deg); transition: transform 0.3s ease;` }) },
    };
  },
});

export type PaginationReason = 'format' | 'cleanup' | 'paste' | 'load' | 'update';

interface TipTapProps {
  projectId: string;
  userId: string;
  userName: string;
  userColor: string;
  onReady: (editor: any) => void;
  columns?: number;
  columnGap?: string;
}

export default function TipTap({ projectId, userId, userName, userColor, onReady, columns = 1, columnGap = 'normal' }: TipTapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const paginationLockRef = useRef(false);
  const debounceTimerRef = useRef<any>(null);

  const { ydoc, provider } = React.useMemo(() => {
    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: process.env.NEXT_PUBLIC_COLLAB_URL || 'ws://localhost:4001',
      name: projectId,
      document: ydoc,
      token: typeof window !== 'undefined' ? localStorage.getItem('underroot_token') || '' : '',
    });
    return { ydoc, provider };
  }, [projectId]);

  /* ═══════════════════════════════════════════════════════════════
     TRUE PAGE OVERFLOW ENGINE
     Moves nodes that overflow horizontally in the CSS columns
     to the next physical page node.
     ═══════════════════════════════════════════════════════════════ */
  const runPagination = useCallback(() => {
    if (!wrapperRef.current) return;
    const pm = wrapperRef.current.querySelector('.ProseMirror') as HTMLElement | null;
    if (!pm) return;
    
    // Find the editor instance from window if possible, or we need to access it via state
    // We bind it in `editor` state below
  }, []);

  const editor = useEditor({
    extensions: [
      CustomDocument,
      Page,
      StarterKit.configure({ document: false, history: false }),
      Highlight, Citation, Underline, TextStyle, Color,
      ExtendedImage.configure({
        inline: true, allowBase64: true,
        HTMLAttributes: { style: 'cursor: pointer; max-width: 100%; height: auto;' },
      }),
      BubbleMenuExtension.configure({
        pluginKey: 'imageBubbleMenu',
        shouldShow: ({ editor }: { editor: any }) => editor.isActive('image'),
        tippyOptions: { appendTo: 'parent', duration: 100 },
      }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider: provider,
        user: { name: userName, color: userColor },
      }),
      Chart,
      InlineMath,
      MathBlock,
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none',
        style: 'font-family: inherit; line-height: inherit; color: inherit; text-align: inherit;',
        spellcheck: 'false',
      },
    },
    onCreate: ({ editor }) => {
      // Migrate older documents that don't start with a page
      const firstNode = editor.state.doc.firstChild;
      if (firstNode && firstNode.type.name !== 'page') {
        editor.commands.command(({ tr }) => {
          const content = tr.doc.content;
          const newPage = editor.schema.nodes.page.create(null, content);
          tr.replaceWith(0, tr.doc.content.size, newPage);
          return true;
        });
      }
      (editor as any).__triggerPagination = triggerPagination;
      onReady(editor);
    },
    onUpdate: () => {
      triggerPagination('update');
    },
    immediatelyRender: false,
  });

  const handleOverflow = useCallback(() => {
    if (!editor || editor.isDestroyed) return;

    let transactionNeeded = false;
    const tr = editor.state.tr;
    
    // Iterate over pages in the editor
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'page') {
        const domNode = editor.view.nodeDOM(pos) as HTMLElement;
        if (!domNode) return false;
        
        const contentEl = domNode.querySelector('.page-content') as HTMLElement;
        if (!contentEl) return false;

        // Check if contentEl overflowed horizontally (created a 3rd column)
        if (contentEl.scrollWidth > contentEl.clientWidth + 5) {
          // Find the first child that overflowed into the 3rd column
          for (let i = 0; i < contentEl.children.length; i++) {
            const child = contentEl.children[i] as HTMLElement;
            
            // In CSS columns, an element pushed into the 3rd column will have an offsetLeft
            // that exceeds the container's width.
            const isOverflowing = child.offsetLeft >= contentEl.clientWidth;
            
            if (isOverflowing) {
              try {
                // posAtDOM returns the position INSIDE the block. We need the position BEFORE it.
                const innerPos = editor.view.posAtDOM(child, 0);
                if (innerPos < 0) continue; // Guard against nodes not mapped in ProseMirror
                
                // Ensure innerPos is within valid document bounds before resolving
                if (innerPos > editor.state.doc.content.size) continue;
                
                const blockPos = Math.max(pos + 1, editor.state.doc.resolve(innerPos).before());
                const blockEnd = pos + node.nodeSize - 1; // End of this page content
                
                if (blockPos > pos && blockEnd > blockPos) {
                  const slice = tr.doc.slice(blockPos, blockEnd);
                  tr.delete(blockPos, blockEnd);
                  
                  const nextNodePos = pos + node.nodeSize;
                  const nextNode = tr.doc.nodeAt(nextNodePos);
                  
                  if (nextNode && nextNode.type.name === 'page') {
                    tr.insert(nextNodePos + 1, slice.content);
                  } else {
                    // Create new page
                    const newPage = editor.schema.nodes.page.create(null, slice.content);
                    tr.insert(pos + node.nodeSize, newPage);
                  }
                  transactionNeeded = true;
                  break; // Break inner loop, resolve one page overflow per pass
                }
              } catch (e) {
                console.warn('Pagination slice error, skipping child:', e);
              }
            }
          }
        }
        return false; // Don't descend into page children
      }
    });

    if (transactionNeeded) {
      editor.view.dispatch(tr);
    }
  }, [editor]);

  const triggerPagination = useCallback((reason: string) => {
    if (paginationLockRef.current) return;
    paginationLockRef.current = true;

    // Run multiple passes to account for layout shifts
    const passes = [0, 150, 500, 1000];
    passes.forEach((delay, index) => {
      setTimeout(() => {
        handleOverflow();
        if (index === passes.length - 1) {
          paginationLockRef.current = false;
        }
      }, delay);
    });
  }, [handleOverflow]);

  // Keep triggerPagination reference fresh on editor
  useEffect(() => {
    if (editor) (editor as any).__triggerPagination = triggerPagination;
  }, [editor, triggerPagination]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      provider.destroy();
      ydoc.destroy();
    };
  }, [ydoc, provider]);

  return (
    <div className="tiptap-editor-wrapper" ref={wrapperRef} id="print-root">
      <EditorContent editor={editor} />

      {/* BubbleMenu for images */}
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} shouldShow={({ editor }) => editor.isActive('image')}>
          <div style={{
            background: '#1A2F23', padding: '6px', borderRadius: '8px',
            display: 'flex', gap: '8px', boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
            border: '1px solid rgba(180,142,77,0.4)', alignItems: 'center', zIndex: 1000,
          }}>
            <button onClick={() => {
              const r = editor.getAttributes('image').rotate || 0;
              editor.chain().focus().updateAttributes('image', { rotate: (r + 90) % 360 }).run();
            }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', padding: '4px 8px' }}>
              Rotate
            </button>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />
            {['33%', '66%', '100%'].map((w, i) => (
              <button key={w} onClick={() => editor.chain().focus().updateAttributes('image', { width: w }).run()}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '11px', padding: '4px' }}>
                {['S', 'M', 'L'][i]}
              </button>
            ))}
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />
            <button onClick={() => editor.chain().focus().deleteSelection().run()}
              style={{ background: '#e11d48', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '11px', borderRadius: '4px', padding: '4px 8px' }}>
              Delete
            </button>
          </div>
        </BubbleMenu>
      )}

      <style>{`
        .tiptap-editor-wrapper {
          position: relative;
          background: #f0f2f5;
          min-height: 100vh;
          padding: 40px 0;
        }

        .ProseMirror {
          width: 100%;
          margin: 0 auto;
          outline: none;
          background: transparent !important;
          box-sizing: border-box !important;
        }

        .page-content {
          column-count: ${columns};
          column-gap: ${columnGap};
          column-fill: auto;
          text-align: justify;
          hyphens: auto;
          orphans: 2;
          widows: 2;
        }

        .ProseMirror p { margin-bottom: 12px; line-height: inherit; }
        .ProseMirror hr { border: none; border-top: 1px solid #ddd; margin: 2rem 0; -webkit-column-span: all; column-span: all; }
        .ProseMirror h1, .ProseMirror h2 { -webkit-column-span: all; column-span: all; text-align: center; margin-bottom: 24px; }
        .ProseMirror h1 { font-size: 24px; font-weight: 900; }
        .ProseMirror h2 { font-size: 18px; font-weight: 700; border-top: 1px solid #eee; padding-top: 16px; margin-top: 32px; }
        .ProseMirror [data-type="citation"] { color: inherit; font-weight: 600; cursor: pointer; }

        .collaboration-cursor__caret {
          position: relative; margin-left: -1px; margin-right: -1px;
          border-left: 2px solid #0d0d0d; border-right: 2px solid #0d0d0d;
          word-break: normal; pointer-events: none;
        }
        .collaboration-cursor__label {
          position: absolute; top: -1.4em; left: -1px;
          font-size: 10px; font-style: normal; font-weight: 700;
          line-height: normal; user-select: none; color: #fff;
          padding: 2px 4px; border-radius: 2px; white-space: nowrap;
        }

        /* ─── PRINT EXPORT STYLES ─── */
        @media print {
          body * {
            visibility: hidden;
            margin: 0; padding: 0;
            background: #fff;
          }
          #print-root, #print-root * {
            visibility: visible;
          }
          #print-root {
            position: absolute;
            left: 0; top: 0;
            width: 100%;
          }
          .page-container {
            margin: 0 !important;
            box-shadow: none !important;
            padding: ${PAGE_PADDING}px !important;
            page-break-after: always;
            break-after: page;
          }
          .page-content {
            /* Ensure columns print correctly based on format */
            column-count: ${columns} !important;
            column-gap: ${columnGap} !important;
          }
        }
      `}</style>
    </div>
  );
}
