"use client";

import { useCallback, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Editor } from "@tiptap/react";
import { useYjsCollaboration } from "@/hooks/useYjsCollaboration";
import TiptapEditor from "@/components/Editor/TiptapEditor";
import CitationPanel from "@/components/Citation/CitationPanel";
import PlagiarismPanel from "@/components/Plagiarism/PlagiarismPanel";
import MindMapPanel from "@/components/Editor/MindMapPanel";
import ExportPanel from "@/components/Editor/ExportPanel";
import { PlagiarismMatch } from "@/types";
import { 
  BookOpen, 
  ShieldCheck, 
  Download, 
  Wifi, 
  WifiOff, 
  ChevronLeft,
  Users,
  Share2,
  Network
} from "lucide-react";
import Link from "next/link";

type Sidebar = "citation" | "plagiarism" | "mindmap" | "export" | null;

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [sidebar, setSidebar] = useState<Sidebar>(null);
  const [plainText, setPlainText] = useState("");
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  const { ydoc, provider, isConnected, connectedUsers } = useYjsCollaboration(
    projectId,
    "Researcher", // Could be dynamic from auth
    "#A68253"
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
      editorInstance.chain().focus().insertContent(` ${citationText} `).run();
    },
    [editorInstance]
  );

  if (!ydoc || !provider) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivy-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-ivy-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-ivy-text/60 font-medium">Connecting to collaboration server…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-ivy-bg text-ivy-text selection:bg-ivy-accent/20">
      {/* Premium Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-md border-b border-ivy-text/5 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Link 
            href="/dashboard"
            className="p-2 hover:bg-ivy-text/5 rounded-full transition-colors text-ivy-text/60 hover:text-ivy-text"
          >
            <ChevronLeft size={20} />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-tight">UnderRoot <span className="text-ivy-accent/60 font-normal ml-1">/ Research Paper</span></h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-ivy-text/40">
                {isConnected ? 'Live Syncing' : 'Offline Mode'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Presence UI */}
          <div className="flex items-center -space-x-2 mr-4">
            {connectedUsers.map((user) => (
              <div
                key={user.clientId}
                title={user.name}
                className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold transition-transform hover:scale-110 cursor-pointer"
                style={{ backgroundColor: user.color }}
              >
                {user.name?.[0]?.toUpperCase() || "R"}
              </div>
            ))}
            {connectedUsers.length > 0 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-ivy-text/5 flex items-center justify-center text-[10px] text-ivy-text/40 font-bold ml-1">
                <Users size={12} />
              </div>
            )}
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-ivy-text text-white rounded-lg text-xs font-bold hover:bg-ivy-text/90 transition-all shadow-sm">
            <Share2 size={14} /> Share
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Editor Area */}
        <div className="flex-1 overflow-auto flex justify-center p-8 bg-[#F5F2EA]/30">
          <div className="w-full max-w-4xl">
            <TiptapEditor
              ydoc={ydoc}
              provider={provider}
              onTextChange={setPlainText}
              onEditorReady={setEditorInstance}
            />
          </div>
        </div>

        {/* Floating Tool Sidebar */}
        <div className="fixed right-8 bottom-8 flex flex-col gap-3 z-40">
          <button
            onClick={() => toggleSidebar("mindmap")}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
              sidebar === "mindmap"
                ? "bg-ivy-accent text-white scale-110"
                : "bg-white text-ivy-text hover:bg-ivy-text hover:text-white"
            }`}
          >
            <Network size={20} />
          </button>
          <button
            onClick={() => toggleSidebar("citation")}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
              sidebar === "citation"
                ? "bg-ivy-accent text-white scale-110"
                : "bg-white text-ivy-text hover:bg-ivy-text hover:text-white"
            }`}
          >
            <BookOpen size={20} />
          </button>
          <button
            onClick={() => toggleSidebar("plagiarism")}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
              sidebar === "plagiarism"
                ? "bg-ivy-text text-white scale-110"
                : "bg-white text-ivy-text hover:bg-ivy-text hover:text-white"
            }`}
          >
            <ShieldCheck size={20} />
          </button>
          <button 
            onClick={() => toggleSidebar("export")}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
              sidebar === "export"
                ? "bg-ivy-accent text-white scale-110"
                : "bg-white text-ivy-text hover:bg-ivy-text hover:text-white"
            }`}
          >
            <Download size={20} />
          </button>
        </div>

        {/* Drawer Sidebars */}
        {sidebar && (
          <aside className="absolute right-0 top-0 bottom-0 w-[400px] bg-white border-l border-ivy-text/5 shadow-[-20px_0_40px_rgba(0,0,0,0.05)] z-50 overflow-auto animate-in slide-in-from-right duration-300">
            <div className="p-4 flex items-center justify-between border-b border-ivy-text/5">
              <h3 className="font-bold text-sm uppercase tracking-widest text-ivy-text/40">
                {sidebar === "citation" ? "Citation Assistant" : 
                 sidebar === "plagiarism" ? "Plagiarism Guard" : 
                 sidebar === "mindmap" ? "Structural Mapping" : 
                 "Export Paper"}
              </h3>
              <button 
                onClick={() => setSidebar(null)}
                className="p-1 hover:bg-ivy-text/5 rounded-full"
              >
                <ChevronLeft size={18} className="rotate-180" />
              </button>
            </div>
            {sidebar === "citation" && <CitationPanel projectId={projectId} onInsert={insertCitationIntoEditor} />}
            {sidebar === "mindmap" && <MindMapPanel text={plainText} projectId={projectId} />}
            {sidebar === "export" && <ExportPanel title="Research Paper" content={plainText} projectId={projectId} />}
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