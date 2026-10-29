"use client";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { apiGet } from "@/shared/http/client";
import type { Page } from "@/shared/contracts/api";
import type { ArticleSummary } from "../domain/models";
export function useArticleSearch(
  query: string,
  enabled: boolean,
  initial: ArticleSummary[],
) {
  const locale=useLocale();const t=useTranslations("header");
  const [state, setState] = useState<{
    items: ArticleSummary[];
    total: number;
    loading: boolean;
    error: string;
  }>({
    items: initial.slice(0, 4),
    total: initial.length,
    loading: false,
    error: "",
  });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: "" }));
    const timer = setTimeout(() => {
      apiGet<Page<ArticleSummary>>(
        `/api/v1/articles?q=${encodeURIComponent(query)}&pageSize=4&locale=${encodeURIComponent(locale)}`,
        { signal: controller.signal },
      )
        .then((data) => {
          if (!controller.signal.aborted)
            setState({
              items: data.items,
              total: data.total,
              loading: false,
              error: "",
            });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setState({
              items: [],
              total: 0,
              loading: false,
              error: t("error"),
            });
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled, locale, t]);
  return state;
}
