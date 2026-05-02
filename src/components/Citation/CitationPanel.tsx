"use client";

import { useState } from "react";
import { useCitation } from "@/hooks/useCitation";
import CitationCard from "./CitationCard";
import { Search } from "lucide-react";

interface CitationPanelProps {
  projectId: string;
  onInsert?: (citation: string) => void;
}

export default function CitationPanel({ projectId, onInsert }: CitationPanelProps) {
  const [claim, setClaim] = useState("");
  const { suggestCitations, results, loading, error } = useCitation();

  const handleSearch = async () => {
    if (claim.trim()) {
      await suggestCitations(claim, projectId);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-semibold text-gray-800">Citation Suggestions</h2>
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
        className="flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Search size={16} />
        {loading ? "Searching…" : "Find Citations"}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex flex-col gap-2 mt-2">
        {results.map((result) => (
          <CitationCard key={result.paperId} citation={result} onInsert={onInsert} />
        ))}
      </div>
    </div>
  );
}
