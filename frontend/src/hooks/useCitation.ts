"use client";

import { useState, useCallback } from "react";
import { citationAPI } from "@/lib/api";
import { CitationResult } from "@/types";

export function useCitation() {
  const [results, setResults] = useState<CitationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestCitations = useCallback(async (text: string, projectId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await citationAPI.suggest(text, projectId);
      
      // Fallback for both old and new API response shapes based on the merge conflict history
      const citations = response.data.citations || response.data?.data?.citations;
      if (citations) {
        setResults(citations as CitationResult[]);
      } else if (response.data.success === false) {
        setError(response.data.error?.message || "Failed to fetch citations");
        setResults([]);
      } else {
        setResults([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch citations");
    } finally {
      setLoading(false);
    }
  }, []);

  const formatCitation = useCallback(async (source: CitationResult, style: string) => {
    try {
      const response = await citationAPI.format(source, style);
      return response.data.citation_text;
    } catch (err: unknown) {
      console.error("Format citation error:", err);
      return `[Citation Error: ${err instanceof Error ? err.message : 'Unknown'}]`;
    }
  }, []);

  return { suggestCitations, formatCitation, results, loading, error };
}
