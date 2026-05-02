"use client";

import { CitationResult } from "@/types";
import { ExternalLink, Plus } from "lucide-react";

interface CitationCardProps {
  citation: CitationResult;
  onInsert?: (citation: string) => void;
}

export default function CitationCard({ citation, onInsert }: CitationCardProps) {
  const authorsStr = citation.authors.slice(0, 3).join(", ") +
    (citation.authors.length > 3 ? " et al." : "");

  const handleInsert = () => {
    if (onInsert) {
      onInsert(`[${citation.title}] (${authorsStr}, ${citation.year})`);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white hover:border-blue-300 transition-colors">
      <h3 className="font-medium text-sm text-gray-900 line-clamp-2">{citation.title}</h3>
      <p className="text-xs text-gray-500 mt-1">
        {authorsStr} · {citation.year} · {citation.venue}
      </p>
      <p className="text-xs text-gray-400 mt-0.5">
        Cited by {citation.citationCount.toLocaleString()}
      </p>

      <div className="mt-2 flex items-center gap-1">
        <span className="text-xs text-gray-500">Relevance:</span>
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${Math.round(citation.relevanceScore * 100)}%` }}
          />
        </div>
        <span className="text-xs text-gray-600">
          {Math.round(citation.relevanceScore * 100)}%
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        {citation.doi && (
          <a
            href={`https://doi.org/${citation.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded hover:bg-gray-200"
          >
            DOI <ExternalLink size={10} />
          </a>
        )}
        <button
          onClick={handleInsert}
          className="inline-flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 ml-auto"
        >
          <Plus size={10} /> Insert
        </button>
      </div>
    </div>
  );
}
