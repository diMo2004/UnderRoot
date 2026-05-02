"use client";

import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Table as TableIcon,
  Undo,
  Redo,
  Highlighter
} from "lucide-react";

interface MenuBarProps {
  editor: Editor;
}

export default function MenuBar({ editor }: MenuBarProps) {
  const btn = (active: boolean) =>
    `p-2 rounded-lg transition-all duration-200 ${
      active 
        ? "bg-ivy-accent text-white shadow-sm" 
        : "text-ivy-text/60 hover:bg-ivy-text/5 hover:text-ivy-text"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-white/50 backdrop-blur-sm border-b border-ivy-text/5 sticky top-0 z-10">
      <div className="flex items-center gap-0.5 px-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btn(editor.isActive("bold"))}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btn(editor.isActive("italic"))}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={btn(editor.isActive("strike"))}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={btn(editor.isActive("highlight"))}
          title="Highlight"
        >
          <Highlighter size={16} />
        </button>
      </div>

      <div className="w-px h-6 bg-ivy-text/10 mx-1" />

      <div className="flex items-center gap-0.5 px-2">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={btn(editor.isActive("heading", { level: 1 }))}
          title="Heading 1"
        >
          <Heading1 size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={btn(editor.isActive("heading", { level: 2 }))}
          title="Heading 2"
        >
          <Heading2 size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={btn(editor.isActive("heading", { level: 3 }))}
          title="Heading 3"
        >
          <Heading3 size={16} />
        </button>
      </div>

      <div className="w-px h-6 bg-ivy-text/10 mx-1" />

      <div className="flex items-center gap-0.5 px-2">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btn(editor.isActive("bulletList"))}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btn(editor.isActive("orderedList"))}
          title="Ordered List"
        >
          <ListOrdered size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={btn(editor.isActive("blockquote"))}
          title="Quote"
        >
          <Quote size={16} />
        </button>
      </div>

      <div className="w-px h-6 bg-ivy-text/10 mx-1" />

      <div className="flex items-center gap-0.5 px-2">
        <button
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          className={btn(false)}
          title="Insert Table"
        >
          <TableIcon size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().undo().run()}
          className={btn(false)}
          title="Undo"
          disabled={!editor.can().undo()}
        >
          <Undo size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          className={btn(false)}
          title="Redo"
          disabled={!editor.can().redo()}
        >
          <Redo size={16} />
        </button>
      </div>
    </div>
  );
}
