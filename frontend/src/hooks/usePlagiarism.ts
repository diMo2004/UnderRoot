"use client";

import { useState, useCallback } from "react";
import { plagiarismAPI } from "@/lib/api";
import { PlagiarismResult } from "@/types";

function normalizePlagiarismPayload(raw: any): PlagiarismResult {
  const payload = raw?.data?.success ? raw.data.data : raw?.data ?? raw;

  const sections = (payload?.sections ?? []).map((s: any) => ({
    sectionTitle: s.sectionTitle ?? s.section_title ?? "Document",
    overallScore: s.overallScore ?? s.overall_score ?? 0,
    severity: s.severity ?? "low",
    matches: (s.matches ?? []).map((m: any) => ({
      matchedText: m.matchedText ?? m.matched_text ?? "",
      source: m.source ?? "corpus",
      similarity: m.similarity ?? 0,
      startIndex: m.startIndex ?? m.start_index ?? 0,
      endIndex: m.endIndex ?? m.end_index ?? 0,
      sourceIndex: m.sourceIndex ?? m.source_index,
      sourceText: m.sourceText ?? m.source_text,
      sourceLayer: m.sourceLayer ?? m.source_layer,
      candidateSourceIndices: m.candidateSourceIndices ?? m.candidate_source_indices,
      topSources: m.topSources ?? m.top_sources,
      riskBand: m.riskBand ?? m.risk_band,
      heatmapColor: m.heatmapColor ?? m.heatmap_color,
    })),
  }));

  return {
    overallScore: payload?.overallScore ?? payload?.overall_score ?? 0,
    severity: payload?.severity ?? "low",
    sections,
    checkedAt: payload?.checkedAt ?? payload?.checked_at ?? new Date().toISOString(),
  };
}

export function usePlagiarism() {
  const [result, setResult] = useState<PlagiarismResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPlagiarism = useCallback(async (text: string, projectId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await plagiarismAPI.check(text, projectId);
      const normalized = normalizePlagiarismPayload(response);
      setResult(normalized);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to check plagiarism");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { checkPlagiarism, result, loading, error };
}