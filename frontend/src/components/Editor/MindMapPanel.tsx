"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { summaryAPI } from "@/lib/api";
import { Network, Sparkles, Download } from "lucide-react";

interface MindMapPanelProps {
  text: string;
  projectId: string;
}

export default function MindMapPanel({ text, projectId }: MindMapPanelProps) {
  const [mermaidCode, setMermaidCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: "base",
      themeVariables: {
        primaryColor: "#A68253",
        primaryTextColor: "#fff",
        primaryBorderColor: "#1B281A",
        lineColor: "#1B281A",
        secondaryColor: "#FBF9F1",
        tertiaryColor: "#FBF9F1",
      },
    });
  }, []);

  const generateMap = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await summaryAPI.mindmap(text, projectId);
      setMermaidCode(data.mermaid);
    } catch (err: any) {
      setError(err.message || "Failed to generate mind map");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mermaidCode && mermaidRef.current) {
      mermaidRef.current.removeAttribute("data-processed");
      mermaid.contentLoaded();
    }
  }, [mermaidCode]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-serif font-bold text-ivy-text">Structural Mind Map</h2>
        <div className="p-2 bg-ivy-accent/10 rounded-lg text-ivy-accent">
          <Network size={20} />
        </div>
      </div>

      <p className="text-xs text-ivy-text/50 leading-relaxed">
        Visualize the hierarchy and conceptual flow of your research paper using AI-generated mind mapping.
      </p>

      <button
        onClick={generateMap}
        disabled={loading || !text.trim()}
        className="flex items-center justify-center gap-2 bg-ivy-text text-white rounded-xl py-3 text-sm font-bold hover:bg-ivy-text/90 transition-all shadow-md disabled:opacity-50"
      >
        <Sparkles size={16} />
        {loading ? "Mapping concepts..." : "Generate Mind Map"}
      </button>

      {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

      {mermaidCode && (
        <div className="mt-4 flex flex-col gap-4">
          <div 
            ref={mermaidRef} 
            className="mermaid bg-white border border-ivy-text/5 rounded-2xl p-4 overflow-auto flex justify-center min-h-[300px]"
          >
            {mermaidCode}
          </div>
          
          <button className="flex items-center justify-center gap-2 text-ivy-text/40 hover:text-ivy-text transition-colors text-xs font-bold uppercase tracking-widest">
            <Download size={14} /> Export Diagram
          </button>
        </div>
      )}

      {!mermaidCode && !loading && (
        <div className="h-64 border-2 border-dashed border-ivy-text/5 rounded-2xl flex flex-col items-center justify-center text-ivy-text/20 gap-2">
          <Network size={32} strokeWidth={1.5} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Map will appear here</span>
        </div>
      )}
    </div>
  );
}
