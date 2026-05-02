"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Highlight from "@tiptap/extension-highlight";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import MenuBar from "./MenuBar";

interface TiptapEditorProps {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  onTextChange?: (text: string) => void;
  onEditorReady?: (editor: Editor) => void;
}

export default function TiptapEditor({
  ydoc,
  provider,
  onTextChange,
  onEditorReady,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({ provider }),
      Placeholder.configure({ placeholder: "The canvas for serious research. Start writing…" }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Highlight.configure({ multicolor: true }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-sm md:prose-base lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[1000px] py-12 px-8 md:px-16 lg:px-20 font-serif leading-relaxed text-ivy-text",
      },
    },
    onUpdate({ editor }) {
      onTextChange?.(editor.getText());
    },
    onCreate({ editor }) {
      onTextChange?.(editor.getText());
    },
  });

  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  return (
    <div className="flex flex-col bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)] rounded-xl overflow-hidden min-h-screen">
      {editor && <MenuBar editor={editor} />}
      <div className="flex-1">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}