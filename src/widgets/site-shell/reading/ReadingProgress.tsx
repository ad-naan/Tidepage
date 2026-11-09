"use client";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/shared/i18n/navigation";
import styles from "./ReadingProgress.module.css";
import { useArticleReadingValue } from "@/modules/content/ui/articles/useArticleReading";

/** Measures the article itself; comments and the footer don't dilute reading progress. */
export function ReadingProgress({ title }: { title: string }) {
  const t = useTranslations("header");
  const format = useFormatter();
  const percent = useArticleReadingValue("percent");
  return (
    <>
      <Link
        href="/articles"
        className={styles.back}
        aria-label={t("backToArticles")}
      >
        <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <circle className={styles.track} cx="18" cy="18" r="15.5" />
          <circle
            className={styles.arc}
            cx="18"
            cy="18"
            r="15.5"
            pathLength="100"
            strokeDasharray="100 100"
            strokeDashoffset={100 - percent}
          />
        </svg>
        <ArrowLeft size={13} />
      </Link>
      <div className={styles.copy}>
        <span className={styles.caption}>
          {t("reading")}
          <i />
          <span
            className={styles.percent}
            role="progressbar"
            aria-label={t("readingProgress")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            {format.number(percent / 100, {
              style: "percent",
              maximumFractionDigits: 0,
            })}
          </span>
        </span>
        <strong>{title}</strong>
      </div>
    </>
  );
}
