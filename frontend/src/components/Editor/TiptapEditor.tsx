"use client";

import { useEditor, EditorContent } from "@tiptap/react";
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
}

export default function TiptapEditor({ ydoc, provider }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({ provider }),
      Placeholder.configure({ placeholder: "Start writing your research paper…" }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Highlight.configure({ multicolor: true }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-lg max-w-none focus:outline-none min-h-[calc(100vh-200px)] p-8",
      },
    },
  });

  return (
    <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-white">
      {editor && <MenuBar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
