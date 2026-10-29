"use client";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "@/shared/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import type { ArticleSummary, Category } from "../domain/models";
import type { Page } from "@/shared/contracts/api";
import { Link } from "@/shared/i18n/navigation";
import { ArticleList } from "@/modules/content/ui/ArticleList";
import { MiniSketch } from "@/components/Sketch";
import { PageHeading, SpringButton } from "@/shared/ui/primitives";

export function ArticleIndex({ result, category }: { result: Page<ArticleSummary>; category?: Category }) {
  const t=useTranslations("articles"),categories=useTranslations("categories");
  const params = useSearchParams();
  const router = useRouter();
  const selected = category || "all";
  const [query, setQuery] = useState(params.get("q") || "");
  const search = params.toString();
  useEffect(() => {
    setQuery(new URLSearchParams(search).get("q") || "");
  }, [search]);
  useEffect(() => {
    const current = new URLSearchParams(search);
    if (query === (current.get("q") || "")) return;
    const timer = setTimeout(() => {
      if (query.trim()) current.set("q", query.trim());
      else current.delete("q");
      current.delete("page");
      router.replace(`/articles${current.size ? `?${current}` : ""}`, {
        scroll: false,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query, search, router]);
  function categoryUrl(category: string) {
    const next = new URLSearchParams(search);
    if (category === "all") next.delete("category");
    else next.set("category", category);
    next.delete("page");
    return `/articles${next.size ? `?${next}` : ""}`;
  }
  function pageUrl(page: number) {
    const next = new URLSearchParams(search);
    next.set("page", String(page));
    return `/articles?${next}`;
  }
  return (
    <div className="inner-page">
      <PageHeading
        title={t("title")}
        description={t("description")}
      />
      <div className="filter-bar">
        <div className="tabs">
          {(["all", "technology", "product", "life"] as const).map((c) => (
            <button
              key={c}
              aria-pressed={selected === c}
              className={selected === c ? "selected" : ""}
              onClick={() => router.replace(categoryUrl(c), { scroll: false })}
            >
              {categories(c)}
              {selected === c && (
                <motion.span
                  layoutId="category-tab"
                  className="tab-underline"
                />
              )}
            </button>
          ))}
        </div>
        <input
          className="inline-search"
          aria-label={t("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("placeholder")}
        />
      </div>
      <div className="archive-label">
        <span>{t("archive")}</span>
        <span>{t("count", {count:result.total})}</span>
      </div>
      <ArticleList items={result.items} />
      {result.pageCount > 1 && (
        <nav className="archive-pagination" aria-label={t("pagination")}>
          {result.page > 1 ? (
            <Link href={pageUrl(result.page - 1)}>{t("previous")}</Link>
          ) : (
            <span />
          )}
          <span>
            {result.page} / {result.pageCount}
          </span>
          {result.page < result.pageCount ? (
            <Link href={pageUrl(result.page + 1)}>{t("next")}</Link>
          ) : (
            <span />
          )}
        </nav>
      )}
      {!result.items.length && (
        <div className="empty-state">
          <MiniSketch kind="tree" />
          <h3>{t("empty")}</h3>
          <p>{t("try")}</p>
          <SpringButton
            className="button-outline"
            onClick={() => {
              setQuery("");
              router.replace("/articles");
            }}
          >
            {t("all")}
          </SpringButton>
        </div>
      )}
    </div>
  );
}
