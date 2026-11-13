"use client";
import { DateTime } from "@/shared/ui/typography/DateTime";
import { PencilLine } from "@/shared/ui/drawing/CoastalMarks";
import { Link } from "@/shared/i18n/navigation";
import { motion, useReducedMotion } from "motion/react";
import type { ArticleSummary } from "@/modules/content/domain/models";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import { listItemMotion } from "@/shared/lib/motion";
import { useTranslations } from "next-intl";
import { normalizeTags, taggedUrl } from "@/modules/content/domain/tags";
import styles from "./ArticleList.module.css";
export function ArticleList({
  items,
  lead = false,
}: {
  items: ArticleSummary[];
  lead?: boolean;
}) {
  const reduced = useReducedMotion();
  const t = useTranslations("tags");
  return (
    <div className="article-list">
      {items.map((article, i) => {
        const tags = normalizeTags(article.tags);
        return (
          <motion.article key={article.slug} {...listItemMotion(i, reduced)}>
            <div
              className={`article-row ${styles.row}${lead && i === 0 ? " article-lead" : ""}`}
            >
              <DateTime value={article.date} layout="calendar" />
              <div className="article-info">
                <h3>
                  <Link
                    className={styles.title}
                    href={`/articles/${article.slug}`}
                  >
                    {article.title}
                  </Link>
                </h3>
                {lead && i === 0 && (
                  <p className="article-excerpt">{article.excerpt}</p>
                )}
                <div className={`tags ${styles.tags}`}>
                  {tags.slice(0, 3).map((tag) => (
                    <Link key={tag} href={taggedUrl("articles", tag)}>
                      #{tag}
                    </Link>
                  ))}
                  {tags.length > 3 && (
                    <Link
                      href={`/articles/${article.slug}`}
                      aria-label={t("more", {
                        count: tags.length - 3,
                      })}
                    >
                      +{tags.length - 3}
                    </Link>
                  )}
                </div>
              </div>
              <CoastalVignette kind={article.sketch} />
              <PencilLine
                kind={(["trail", "fold", "shore"] as const)[i % 3]}
                className="article-shore"
              />
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
