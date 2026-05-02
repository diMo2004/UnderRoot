"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { Editor } from "@tiptap/react";
import { useYjsCollaboration } from "@/hooks/useYjsCollaboration";
import TiptapEditor from "@/components/Editor/TiptapEditor";
import CitationPanel from "@/components/Citation/CitationPanel";
import PlagiarismPanel from "@/components/Plagiarism/PlagiarismPanel";
import { PlagiarismMatch } from "@/types";
import { BookOpen, ShieldCheck, Download, Wifi, WifiOff } from "lucide-react";

type Sidebar = "citation" | "plagiarism" | null;

export default function EditorPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [sidebar, setSidebar] = useState<Sidebar>(null);
  const [plainText, setPlainText] = useState("");
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  const { ydoc, provider, isConnected, connectedUsers } = useYjsCollaboration(
    projectId,
    "Anonymous",
    "#4f86f7"
  );

  const toggleSidebar = (panel: Sidebar) =>
    setSidebar((prev) => (prev === panel ? null : panel));

  const applyMatchesToEditor = useCallback(
    (matches: PlagiarismMatch[]) => {
      if (!editorInstance) return;

      editorInstance.chain().focus().unsetHighlight().run();

      const fullText = editorInstance.state.doc.textBetween(
        0,
        editorInstance.state.doc.content.size,
        "\n"
      );

      let cursor = 0;
      for (const match of matches) {
        const target = (match.matchedText || "").trim();
        if (!target) continue;

        const idx = fullText.indexOf(target, cursor);
        if (idx === -1) continue;

        const from = idx + 1;
        const to = from + target.length;

        editorInstance
          .chain()
          .focus()
          .setTextSelection({ from, to })
          .setHighlight({ color: match.heatmapColor || "#fef08a" })
          .run();

        cursor = idx + target.length;
      }

      const endPos = editorInstance.state.doc.content.size;
      editorInstance.chain().focus().setTextSelection(endPos).run();
    },
    [editorInstance]
  );

  const insertCitationIntoEditor = useCallback(
    (citationText: string) => {
      if (!editorInstance) {
        console.warn("Editor not ready; cannot insert citation yet.");
        return;
      }
      editorInstance.chain().focus().insertContent(` (${citationText}) `).run();
    },
    [editorInstance]
  );

  if (!ydoc || !provider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Connecting to collaboration server…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-gray-900">📝 UnderRoot</span>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {isConnected ? (
              <>
                <Wifi size={12} className="text-green-500" />
                <span className="text-green-600">Connected</span>
              </>
            ) : (
              <>
                <WifiOff size={12} className="text-red-400" />
                <span className="text-red-500">Disconnected</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {connectedUsers.map((user) => (
              <div
                key={user.clientId}
                title={user.name}
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-semibold"
                style={{ backgroundColor: user.color }}
              >
                {user.name[0]?.toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleSidebar("citation")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sidebar === "citation"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <BookOpen size={14} /> Cite
          </button>
          <button
            onClick={() => toggleSidebar("plagiarism")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sidebar === "plagiarism"
                ? "bg-purple-100 text-purple-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <ShieldCheck size={14} /> Plagiarism
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">
            <Download size={14} /> Export
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-4">
          <TiptapEditor
            ydoc={ydoc}
            provider={provider}
            onTextChange={setPlainText}
            onEditorReady={setEditorInstance}
          />
        </div>

        {sidebar && (
          <aside className="w-80 border-l border-gray-200 bg-white overflow-auto flex-shrink-0">
            {sidebar === "citation" && <CitationPanel projectId={projectId} />}
            {sidebar === "plagiarism" && (
              <PlagiarismPanel
                text={plainText}
                projectId={projectId}
                onHighlightMatches={applyMatchesToEditor}
                onInsertCitation={insertCitationIntoEditor}
              />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}