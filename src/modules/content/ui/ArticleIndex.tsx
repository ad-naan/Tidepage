"use client";
import { useEffect, useState } from "react";
import { useRouter } from "@/shared/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import type { ArticleSummary } from "../domain/models";
import type { Page } from "@/shared/contracts/api";
import { Link } from "@/shared/i18n/navigation";
import { ArticleList } from "@/modules/content/ui/ArticleList";
import { MiniSketch } from "@/components/Sketch";
import { PageHeading, SpringButton } from "@/shared/ui/primitives";

export function ArticleIndex({ result }: { result: Page<ArticleSummary> }) {
  const params = useSearchParams();
  const router = useRouter();
  const selected = params.get("category") || "全部";
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
    if (category === "全部") next.delete("category");
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
        title="写在光阴里"
        description="记录思考、尝试和转变。让每一次向前，都有迹可循。"
      />
      <div className="filter-bar">
        <div className="tabs">
          {["全部", "技术", "产品", "生活"].map((c) => (
            <button
              key={c}
              aria-pressed={selected === c}
              className={selected === c ? "selected" : ""}
              onClick={() => router.replace(categoryUrl(c), { scroll: false })}
            >
              {c}
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
          aria-label="筛选文章"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入关键词…"
        />
      </div>
      <div className="archive-label">
        <span>光阴归档</span>
        <span>{result.total} 篇文章 · 持续记录</span>
      </div>
      <ArticleList items={result.items} />
      {result.pageCount > 1 && (
        <nav className="archive-pagination" aria-label="文章分页">
          {result.page > 1 ? (
            <Link href={pageUrl(result.page - 1)}>上一页</Link>
          ) : (
            <span />
          )}
          <span>
            {result.page} / {result.pageCount}
          </span>
          {result.page < result.pageCount ? (
            <Link href={pageUrl(result.page + 1)}>下一页</Link>
          ) : (
            <span />
          )}
        </nav>
      )}
      {!result.items.length && (
        <div className="empty-state">
          <MiniSketch kind="tree" />
          <h3>这里还没有故事</h3>
          <p>换个关键词，或看看其他分类。</p>
          <SpringButton
            className="button-outline"
            onClick={() => {
              setQuery("");
              router.replace("/articles");
            }}
          >
            查看全部文章
          </SpringButton>
        </div>
      )}
    </div>
  );
}
