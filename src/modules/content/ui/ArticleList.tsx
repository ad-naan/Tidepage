"use client";
import Link from "next/link";
import { motion } from "motion/react";
import type { ArticleSummary } from "../domain/models";
import { MiniSketch } from "@/components/Sketch";
import { spring } from "@/shared/lib/motion";
export function ArticleList({
  items,
  lead = false,
}: {
  items: ArticleSummary[];
  lead?: boolean;
}) {
  return (
    <div className="article-list">
      {items.map((article, i) => (
        <motion.article
          key={article.slug}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: i * 0.045 }}
        >
          <Link
            href={`/articles/${article.slug}`}
            className={`article-row${lead && i === 0 ? " article-lead" : ""}`}
          >
            <time dateTime={article.date}>
              <span>{article.date.slice(8)}</span>
              <small>
                {
                  [
                    "JAN",
                    "FEB",
                    "MAR",
                    "APR",
                    "MAY",
                    "JUN",
                    "JUL",
                    "AUG",
                    "SEP",
                    "OCT",
                    "NOV",
                    "DEC",
                  ][Number(article.date.slice(5, 7)) - 1]
                }
              </small>
            </time>
            <div className="article-info">
              <h3>{article.title}</h3>
              {lead && i === 0 && (
                <p className="article-excerpt">{article.excerpt}</p>
              )}
              <div className="tags">
                {article.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            </div>
            <MiniSketch kind={article.sketch} />
          </Link>
        </motion.article>
      ))}
    </div>
  );
}
