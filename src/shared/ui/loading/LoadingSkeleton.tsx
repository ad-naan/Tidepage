"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./LoadingSkeleton.module.css";

/** Reserve content space immediately; reveal feedback only when loading persists. */
export function LoadingSkeleton({
  variant = "page",
}: {
  variant?: "page" | "rows" | "document" | "cards";
}) {
  const t = useTranslations("ui");
  const [announce, setAnnounce] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAnnounce(true), 500);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div
      className={`${styles.root} ${styles[variant]}`}
      role="status"
      aria-live="polite"
      data-loading-skeleton={variant}
    >
      <div className={styles.visual} aria-hidden="true">
        {variant === "page" && (
          <div className={styles.heading}>
            <div>
              <i className={styles.title} />
              <i className={styles.subtitle} />
            </div>
            <i className={styles.action} />
          </div>
        )}
        {variant === "cards" ? (
          <div className={styles.cards}>
            {[0, 1].map((key) => (
              <div className={styles.card} key={key}>
                <i className={styles.short} />
                <i className={styles.title} />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.rows}>
            {[0, 1, 2, 3].map((key) => (
              <div className={styles.row} key={key}>
                <i />
                <i className={styles.short} />
              </div>
            ))}
          </div>
        )}
      </div>
      {announce && <span className={styles.srOnly}>{t("loading.label")}</span>}
    </div>
  );
}
