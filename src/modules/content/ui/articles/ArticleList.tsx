"use client";
import { DateTime } from "@/shared/ui/typography/DateTime";
import { PencilLine } from "@/shared/ui/drawing/CoastalMarks";
import { Link } from "@/shared/i18n/navigation";
import { motion } from "motion/react";
import type { ArticleSummary } from "@/modules/content/domain/models";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
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
            <DateTime value={article.date} layout="calendar" />
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
            <CoastalVignette kind={article.sketch} />
            <PencilLine
              kind={(["trail", "fold", "shore"] as const)[i % 3]}
              className="article-shore"
            />
          </Link>
        </motion.article>
      ))}
    </div>
  );
}
