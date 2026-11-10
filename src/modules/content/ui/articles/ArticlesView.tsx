"use client";
import { Input } from "@/shared/ui/field/Input";
import { ContentHeading } from "@/modules/content/ui/layout/ContentHeading";
import styles from "./ArticlesView.module.css";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "@/shared/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import { PencilLine, SketchLabel } from "@/shared/ui/drawing/CoastalMarks";
import { Search } from "lucide-react";
import type { ArticleSummary, Category } from "@/modules/content/domain/models";
import type { Page } from "@/shared/contracts/api";
import { Link } from "@/shared/i18n/navigation";
import { ArticleList } from "./ArticleList";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import { Button } from "@/shared/ui/button/Button";

export function ArticlesView({
  result,
  category,
}: {
  result: Page<ArticleSummary>;
  category?: Category;
}) {
  const t = useTranslations("articles"),
    categories = useTranslations("categories");
  const params = useSearchParams();
  const router = useRouter();
  const selected = category || "all";
  const [chosen, setChosen] = useState(selected);
  const [pending, transition] = useTransition();
  useEffect(() => setChosen(selected), [selected]);
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
    <div className={`inner-page ${styles.archive}`}>
      <ContentHeading
        room="archive"
        title={t("title")}
        description={t("description")}
      />
      <div className="filter-bar">
        <FilterTabs
          value={chosen}
          options={(["all", "technology", "product", "life"] as const).map(
            (value) => ({ value, label: categories(value) }),
          )}
          label={t("filterLabel")}
          busy={pending}
          onChange={(value) => {
            setChosen(value);
            transition(() =>
              router.replace(categoryUrl(value), { scroll: false }),
            );
          }}
        />
        <label className="archive-search">
          <Search size={13} aria-hidden="true" />
          <Input
            appearance="bare"
            className="inline-search"
            aria-label={t("search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
          />
          <PencilLine kind="fold" />
        </label>
        <PencilLine className="toolbar-shore" />
      </div>
      <div className="archive-label">
        <SketchLabel kind="tide">{t("archive")}</SketchLabel>
        <span>{t("count", { count: result.total })}</span>
      </div>
      <ArticleList
        key={result.items.map(({ slug }) => slug).join("/")}
        items={result.items}
        lead
      />
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
          <CoastalVignette kind="tree" />
          <h3>{t("empty")}</h3>
          <p>{t("try")}</p>
          <Button
            className="button-outline"
            onClick={() => {
              setQuery("");
              router.replace("/articles");
            }}
          >
            {t("all")}
          </Button>
        </div>
      )}
    </div>
  );
}
