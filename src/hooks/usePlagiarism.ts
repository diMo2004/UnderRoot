"use client";

import { useState, useCallback } from "react";
import { plagiarismAPI } from "@/lib/api";
import { PlagiarismResult } from "@/types";

export function usePlagiarism() {
  const [result, setResult] = useState<PlagiarismResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPlagiarism = useCallback(async (text: string, projectId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await plagiarismAPI.check(text, projectId);
      const payload = response.data;

      if (!payload.success) {
        setError(payload.error.message);
        setResult(null);
        return;
      }

      setResult(payload.data as PlagiarismResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to check plagiarism");
    } finally {
      setLoading(false);
    }
  }, []);

  return { checkPlagiarism, result, loading, error };
}