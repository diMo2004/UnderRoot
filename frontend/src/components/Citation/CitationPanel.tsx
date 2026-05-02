"use client";

import { useState } from "react";
import { useCitation } from "@/hooks/useCitation";
import CitationCard from "./CitationCard";
import { Search, Settings2 } from "lucide-react";

interface CitationPanelProps {
  projectId: string;
  onInsert?: (citation: string) => void;
}

export default function CitationPanel({ projectId, onInsert }: CitationPanelProps) {
  const [claim, setClaim] = useState("");
  const [style, setStyle] = useState("ieee");
  const { suggestCitations, formatCitation, results, loading, error } = useCitation();

  const handleSearch = async () => {
    if (claim.trim()) {
      await suggestCitations(claim, projectId);
    }
  };

  const handleInsert = async (citation: any) => {
    if (!onInsert) return;
    const formatted = await formatCitation(citation, style);
    onInsert(formatted);
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Citations</h2>
        <div className="flex items-center gap-1 bg-gray-100 rounded-md px-2 py-1">
          <Settings2 size={14} className="text-gray-500" />
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="bg-transparent text-xs text-gray-700 outline-none cursor-pointer"
          >
            <option value="ieee">IEEE</option>
            <option value="apa">APA</option>
            <option value="acm">ACM</option>
          </select>
        </div>
      </div>
      
      <div className="flex gap-2">
        <textarea
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          placeholder="Enter a claim or sentence to find citations…"
          className="flex-1 border border-gray-300 rounded-lg p-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <button
        onClick={handleSearch}
        disabled={loading || !claim.trim()}
        className="flex items-center justify-center gap-2 bg-ivy-text text-white rounded-lg px-4 py-2 text-sm hover:bg-ivy-text/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Search size={16} />
        {loading ? "Searching…" : "Find Citations"}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex flex-col gap-2 mt-2">
        {results.map((result) => (
          <CitationCard
            key={result.paperId}
            citation={result}
            onInsert={() => handleInsert(result)}
          />
        ))}
      </div>
    </div>
  );
}
