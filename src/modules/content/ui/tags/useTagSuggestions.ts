"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/shared/http/client";
import type { ContentTag } from "@/modules/content/domain/tags";
import type { Locale } from "@/shared/i18n/config";

export function useTagSuggestions(
  locale: Locale,
  query: string,
  kind?: "articles" | "notes",
  enabled = true,
) {
  const [state, setState] = useState<{
    tags: ContentTag[];
    loading: boolean;
    error: boolean;
  }>({ tags: [], loading: false, error: false });
  const [attempt, retry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const request = new AbortController();
    setState({ tags: [], loading: true, error: false });
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ locale, q: query, limit: "20" });
      if (kind) params.set("kind", kind);
      apiGet<ContentTag[]>(`/api/v1/tags?${params}`, {
        signal: request.signal,
      }).then(
        (tags) => {
          if (!request.signal.aborted)
            setState({ tags, loading: false, error: false });
        },
        () => {
          if (!request.signal.aborted)
            setState({ tags: [], loading: false, error: true });
        },
      );
    }, 250);
    return () => {
      clearTimeout(timer);
      request.abort();
    };
  }, [locale, query, kind, enabled, attempt]);
  return { ...state, retry: () => retry((value) => value + 1) };
}
