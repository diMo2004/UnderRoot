"use client";

import { useMemo, useState } from "react";
import { usePlagiarism } from "@/hooks/usePlagiarism";
import { PlagiarismMatch, SourceEvidence } from "@/types";
import { ShieldCheck } from "lucide-react";
import { citationAPI } from "@/lib/api";

const severityColors: Record<string, string> = {
  low: "text-green-600 bg-green-50 border-green-200",
  moderate: "text-yellow-700 bg-yellow-50 border-yellow-200",
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
  onHighlightMatches?: (matches: PlagiarismMatch[]) => void;
  onInsertCitation?: (citationText: string) => void;
}

function fallbackHeatColor(sev: string) {
  if (sev === "low") return "#dcfce7";
  if (sev === "moderate") return "#fef9c3";
  if (sev === "high") return "#ffedd5";
  return "#fee2e2";
}

export default function PlagiarismPanel({
  text,
  projectId,
  onHighlightMatches,
  onInsertCitation,
}: PlagiarismPanelProps) {
  const { checkPlagiarism, result, loading, error } = usePlagiarism();

  const [selectedMatch, setSelectedMatch] = useState<PlagiarismMatch | null>(null);
  const [citeStyle, setCiteStyle] = useState<"ieee" | "apa" | "acm">("ieee");
  const [citeLoading, setCiteLoading] = useState(false);
  const [citeError, setCiteError] = useState<string | null>(null);

  const allMatches = useMemo(
    () => result?.sections.flatMap((s) => s.matches || []) ?? [],
    [result]
  );

  const runCheck = async () => {
    setCiteError(null);
    setSelectedMatch(null);
    await checkPlagiarism(text, projectId);
  };

  const applyHeatmap = () => {
    onHighlightMatches?.(allMatches);
  };

  async function citeThis(source: SourceEvidence) {
    if (!onInsertCitation) return;

    setCiteLoading(true);
    setCiteError(null);
    try {
      const resp = await citationAPI.format({
        style: citeStyle,
        source: {
          title: source?.title,
          url: source?.url,
          doi: source?.doi,
          year: source?.year,
          provider: source?.provider,
        },
        index: 1,
      });

      const data = resp.data;
      const citationText = data.citation_text ?? data.citationText ?? "";
      if (!citationText) throw new Error("No citation text returned from server.");

      onInsertCitation(citationText);
    } catch (e: any) {
      setCiteError(e?.message || "Failed to format citation");
    } finally {
      setCiteLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-semibold text-gray-800">Plagiarism Heatmap</h2>

      <button
        onClick={runCheck}
        disabled={loading || !text.trim()}
        className="flex items-center justify-center gap-2 bg-purple-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ShieldCheck size={16} />
        {loading ? "Checking…" : "Check Plagiarism"}
      </button>

      {result && (
        <button
          onClick={applyHeatmap}
          className="text-sm rounded-lg px-4 py-2 border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100"
        >
          Apply Heatmap to Editor
        </button>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded border bg-green-50 border-green-200">🟢 Low</span>
          <span className="px-2 py-1 rounded border bg-yellow-50 border-yellow-200">🟡 Moderate</span>
          <span className="px-2 py-1 rounded border bg-orange-50 border-orange-200">🟠 High</span>
          <span className="px-2 py-1 rounded border bg-red-50 border-red-200">🔴 Critical</span>
        </div>

        <select
          className="text-xs border rounded px-2 py-1"
          value={citeStyle}
          onChange={(e) => setCiteStyle(e.target.value as any)}
          title="Citation style"
        >
          <option value="ieee">IEEE</option>
          <option value="apa">APA</option>
          <option value="acm">ACM</option>
        </select>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {citeError && <p className="text-red-500 text-sm">{citeError}</p>}

      {result && (
        <div className="flex flex-col gap-3">
          <div className={`border rounded-lg p-3 ${severityColors[result.severity]}`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{severityEmoji[result.severity]}</span>
              <div>
                <p className="font-semibold text-sm">Overall Score</p>
                <p className="text-2xl font-bold">{Math.round(result.overallScore * 100)}%</p>
              </div>
            </div>
          </div>

          {result.sections.map((section, idx) => (
            <div key={idx} className={`border rounded-lg p-3 ${severityColors[section.severity]}`}>
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{section.sectionTitle}</p>
                <span className="text-sm">
                  {severityEmoji[section.severity]} {Math.round(section.overallScore * 100)}%
                </span>
              </div>

              {section.matches.length > 0 && (
                <div className="mt-2 flex flex-col gap-2">
                  {section.matches.slice(0, 5).map((match, mIdx) => {
                    const bg =
                      match.heatmapColor ||
                      fallbackHeatColor(match.riskBand || section.severity);

                    return (
                      <button
                        key={mIdx}
                        type="button"
                        onClick={() => setSelectedMatch(match)}
                        className="text-left text-xs rounded p-2 border border-gray-200 hover:border-gray-300"
                        style={{ backgroundColor: bg }}
                        title="Click to view sources"
                      >
                        <div className="font-medium">
                          {(match.riskBand || section.severity).toUpperCase()} —{" "}
                          {Math.round(match.similarity * 100)}%
                        </div>
                        <div className="opacity-80 mt-1 line-clamp-2">{match.matchedText}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {selectedMatch && (
            <div className="border rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Flagged text</div>
                <div className="text-xs text-gray-500">
                  {(selectedMatch.similarity * 100).toFixed(1)}%
                </div>
              </div>

              <div className="mt-2 text-xs text-gray-700 border rounded p-2 bg-gray-50">
                {selectedMatch.matchedText}
              </div>

              <div className="mt-3 text-sm font-semibold">Matched sources</div>
              <div className="mt-2 flex flex-col gap-2">
                {(selectedMatch.topSources || []).slice(0, 3).map((s, i) => (
                  <div key={i} className="border rounded p-2">
                    <div className="text-xs font-medium">
                      {(s as any).url ? (
                        <a className="underline" href={(s as any).url} target="_blank" rel="noreferrer">
                          {(s as any).title || (s as any).url}
                        </a>
                      ) : (
                        (s as any).title || "Untitled"
                      )}
                      {(s as any).year ? <span className="text-gray-500"> ({(s as any).year})</span> : null}
                    </div>

                    <button
                      onClick={() => citeThis(s as any)}
                      disabled={citeLoading || !onInsertCitation}
                      className="mt-2 text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      title={!onInsertCitation ? "Editor not ready" : "Insert citation at cursor"}
                    >
                      {citeLoading ? "Formatting…" : "Cite This"}
                    </button>
                  </div>
                ))}

                {(!selectedMatch.topSources || selectedMatch.topSources.length === 0) && (
                  <div className="text-xs text-gray-500">No source suggestions available for this match.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}