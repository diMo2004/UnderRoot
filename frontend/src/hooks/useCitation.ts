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
<<<<<<< HEAD
      const payload = response.data;

      if (!payload.success) {
        setError(payload.error.message);
        setResults([]);
        return;
      }

      setResults((payload.data?.citations as CitationResult[]) || []);
    } catch {
      setError("Failed to fetch citations");
=======
      setResults(response.data.citations || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch citations");
>>>>>>> ai-service-fix
    } finally {
      setLoading(false);
    }
  }, []);

  return { suggestCitations, results, loading, error };
<<<<<<< HEAD
}
=======
}
>>>>>>> ai-service-fix
