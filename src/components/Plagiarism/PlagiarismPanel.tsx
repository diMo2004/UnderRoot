"use client";

import { usePlagiarism } from "@/hooks/usePlagiarism";
import { ShieldCheck } from "lucide-react";

const severityColors: Record<string, string> = {
  low: "text-green-600 bg-green-50 border-green-200",
  moderate: "text-yellow-600 bg-yellow-50 border-yellow-200",
  high: "text-orange-600 bg-orange-50 border-orange-200",
  critical: "text-red-600 bg-red-50 border-red-200",
};

const severityEmoji: Record<string, string> = {
  low: "🟢",
  moderate: "🟡",
  high: "🟠",
  critical: "🔴",
};

interface PlagiarismPanelProps {
  text: string;
  projectId: string;
}

export default function PlagiarismPanel({ text, projectId }: PlagiarismPanelProps) {
  const { checkPlagiarism, result, loading, error } = usePlagiarism();

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-semibold text-gray-800">Plagiarism Check</h2>
      <button
        onClick={() => checkPlagiarism(text, projectId)}
        disabled={loading || !text.trim()}
        className="flex items-center justify-center gap-2 bg-purple-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ShieldCheck size={16} />
        {loading ? "Checking…" : "Check Plagiarism"}
      </button>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {result && (
        <div className="flex flex-col gap-3">
          <div className={`border rounded-lg p-3 ${severityColors[result.severity]}`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{severityEmoji[result.severity]}</span>
              <div>
                <p className="font-semibold text-sm">Overall Score</p>
                <p className="text-2xl font-bold">
                  {Math.round(result.overallScore * 100)}%
                </p>
              </div>
            </div>
          </div>

          {result.sections.map((section, idx) => (
            <div
              key={idx}
              className={`border rounded-lg p-3 ${severityColors[section.severity]}`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{section.sectionTitle}</p>
                <span className="text-sm">
                  {severityEmoji[section.severity]}{" "}
                  {Math.round(section.overallScore * 100)}%
                </span>
              </div>
              {section.matches.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  {section.matches.slice(0, 3).map((match, mIdx) => (
                    <div key={mIdx} className="text-xs opacity-80">
                      <span className="font-medium">{match.source}</span> —{" "}
                      {Math.round(match.similarity * 100)}% match
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
