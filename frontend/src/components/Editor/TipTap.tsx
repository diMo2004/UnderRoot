"use client";
import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { Citation } from './extensions/Citation';

interface TipTapProps {
  projectId: string;
  userId: string;
  userName: string;
  userColor: string;
  onReady: (editor: any) => void;
}

export default function TipTap({ projectId, userId, userName, userColor, onReady }: TipTapProps) {
  // We use useMemo to ensure ydoc and provider are stable
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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      Placeholder.configure({
        placeholder: 'Begin your scholarly inquiry here...',
      }),
      Highlight,
      Citation,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name: userName,
          color: userColor,
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px]',
        style: 'font-family: inherit; line-height: inherit; color: inherit; text-align: inherit;',
      },
    },
    onCreate({ editor }) {
      onReady(editor);
    },
  });

  useEffect(() => {
    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [ydoc, provider]);

  return (
    <div className="tiptap-editor-wrapper">
      <EditorContent editor={editor} />
      <style>{`
        .ProseMirror {
          padding: 40px;
          min-height: 100%;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
        .collaboration-cursor__caret {
          position: relative;
          margin-left: -1px;
          margin-right: -1px;
          border-left: 2px solid #0d0d0d;
          border-right: 2px solid #0d0d0d;
          word-break: normal;
          pointer-events: none;
        }
        .collaboration-cursor__label {
          position: absolute;
          top: -1.4em;
          left: -1px;
          font-size: 10px;
          font-style: normal;
          font-weight: 700;
          line-height: normal;
          user-select: none;
          color: #fff;
          padding: 2px 4px;
          border-radius: 2px;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
