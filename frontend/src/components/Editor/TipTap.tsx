"use client";
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
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
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';

/* ─── A4 Page Constants (96 DPI) ─── */
const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1123;
const PAGE_PADDING = 96;
const PAGE_GAP = 40;
const CONTENT_HEIGHT = PAGE_HEIGHT - (PAGE_PADDING * 2); // 931px

const ExtendedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: '100%', renderHTML: (a: any) => ({ width: a.width }) },
      rotate: { default: 0, renderHTML: (a: any) => ({ style: `transform: rotate(${a.rotate}deg); transition: transform 0.3s ease;` }) },
    };
  },
});

export type PaginationReason = 'format' | 'cleanup' | 'paste' | 'load';

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
  const [pageCount, setPageCount] = useState(1);

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
     PAGINATION ENGINE
     Uses CSS `margin-top` on blocks that cross page boundaries.
     Runs ONLY on explicit triggers + debounced content settle.
     ═══════════════════════════════════════════════════════════════ */
  const runPagination = useCallback(() => {
    const pm = wrapperRef.current?.querySelector('.ProseMirror') as HTMLElement | null;
    if (!pm) return;

    // Get all block-level children (skip <style> tags)
    const blocks = Array.from(pm.children).filter(
      (el) => el instanceof HTMLElement && el.tagName !== 'STYLE'
    ) as HTMLElement[];
    if (blocks.length === 0) return;

    // 1. CLEAR previous adjustments
    for (const el of blocks) {
      if (el.dataset.pageBreak) {
        el.style.marginTop = '';
        delete el.dataset.pageBreak;
      }
    }
    // Force reflow for clean measurements
    void pm.offsetHeight;

    // Continuous Mode: We don't push text, we just estimate page count
    let maxPage = 1;
    const pmRect = pm.getBoundingClientRect();
    const cycle = PAGE_HEIGHT + PAGE_GAP;

    for (let i = 0; i < blocks.length; i++) {
      const el = blocks[i];
      const elRect = el.getBoundingClientRect();
      const top = elRect.top - pmRect.top;
      const pageIndex = Math.floor(top / cycle);
      maxPage = Math.max(maxPage, pageIndex + 1);
    }

    setPageCount(maxPage);
  }, []);

  const triggerPagination = useCallback((reason: string) => {
    if (paginationLockRef.current) return;
    paginationLockRef.current = true;

    // Run multiple passes to account for layout shifts and font loading
    const passes = [0, 150, 500, 1500];
    passes.forEach((delay, index) => {
      setTimeout(() => {
        runPagination();
        if (index === passes.length - 1) {
          paginationLockRef.current = false;
        }
      }, delay);
    });
  }, [runPagination]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
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
    onUpdate: () => {
      triggerPagination('update');
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none',
        style: 'font-family: inherit; line-height: inherit; color: inherit; text-align: inherit;',
        spellcheck: 'false',
      },
      handlePaste: () => {
        setTimeout(() => triggerPagination('paste'), 100);
        return false;
      },
    },
    onCreate: ({ editor }) => {
      (editor as any).__triggerPagination = triggerPagination;
      onReady(editor);
      // Initial pagination — retry multiple times to catch Yjs sync
      setTimeout(() => triggerPagination('load'), 100);
      setTimeout(() => triggerPagination('load'), 500);
      setTimeout(() => triggerPagination('load'), 1500);
      setTimeout(() => triggerPagination('load'), 3000);
    },
    immediatelyRender: false,
  });

  // Watch for DOM mutations (AI updates, pastes, Yjs sync)
  useEffect(() => {
    if (!editor) return;
    const observer = new MutationObserver(() => triggerPagination('mutation'));
    const pm = editor.view.dom;
    observer.observe(pm, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [editor, triggerPagination]);

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

  // Render page overlay cards
  const pageCards = [];
  for (let i = 0; i < pageCount; i++) {
    pageCards.push(
      <div
        key={i}
        className="page-card"
        style={{
          position: 'absolute',
          left: 0, right: 0,
          top: i * (PAGE_HEIGHT + PAGE_GAP),
          height: PAGE_HEIGHT,
          background: 'white',
          boxShadow: '0 1px 4px rgba(0,0,0,0.15), 0 0 1px rgba(0,0,0,0.1)',
          pointerEvents: 'none',
          zIndex: 0,
          borderRadius: '2px',
        }}
      />
    );
  }

  // Continuous Mode Styles
  return (
    <div className="tiptap-editor-wrapper" ref={wrapperRef} style={{
      background: '#fff',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      width: PAGE_WIDTH,
      margin: '40px auto',
      minHeight: PAGE_HEIGHT,
      position: 'relative',
      transition: 'min-height 0.3s ease',
    }}>
      {/* Hidden overlays since we are in continuous mode, but kept for future toggle */}
      <div className="page-overlays" style={{ display: 'none' }}>
        {pageCards}
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <EditorContent editor={editor} />
      </div>

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
          background: #fff;
        }

        /* Force ALL editor containers transparent so grey gap shows */
        .tiptap-editor-wrapper .tiptap,
        .tiptap-editor-wrapper .EditorContent,
        .tiptap-editor-wrapper [data-tiptap-editor],
        .tiptap-editor-wrapper > div {
          background: transparent !important;
        }

        .ProseMirror {
          width: 100%;
          margin: 0 auto;
          padding: ${PAGE_PADDING}px;
          min-height: ${PAGE_HEIGHT}px;
          outline: none;
          background: transparent !important;
          box-sizing: border-box !important;
        }

        .ProseMirror p { margin-bottom: 12px; line-height: inherit; }
        .ProseMirror hr { border: none; border-top: 1px solid #ddd; margin: 2rem 0; }
        .ProseMirror h1, .ProseMirror h2 { column-span: all; text-align: center; margin-bottom: 24px; }
        .ProseMirror h1 { font-size: 24px; font-weight: 900; }
        .ProseMirror h2 { font-size: 18px; font-weight: 700; border-top: 1px solid #eee; padding-top: 16px; margin-top: 32px; }
        .ProseMirror [data-type="citation"] { color: #B48E4D; font-weight: 700; cursor: pointer; }

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
      `}</style>
    </div>
  );
}
