"use client";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
import { useEffect, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/shared/i18n/navigation";
import { PencilFrame } from "@/shared/ui/drawing/CoastalMarks";
import type { ArticleDraft } from "@/modules/content/domain/editor-document";
import { loadArticleDrafts } from "@/modules/content/ui/admin/draft-store";
import styles from "./DashboardView.module.css";
export function DashboardView({ children }: { children: ReactNode }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [items, setItems] = useState<ArticleDraft[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    loadArticleDrafts()
      .then(setItems)
      .catch(() => setError(true));
  }, []);
  return (
    <>
      <header className={styles.heading}>
        <div>
          <h1>{t("dashboard.title")}</h1>
          <p>{t("dashboard.description")}</p>
        </div>
        <div className={styles.actions}>
          <Link href="/admin/articles/new">{t("articles.new")} ↗</Link>
        </div>
      </header>
      {children}
      {error ? (
        <p role="alert">{t("storageError")}</p>
      ) : items ? (
        <>
          <div className={styles.stats}>
            <div>
              <PencilFrame />
              <span>{t("dashboard.drafts")}</span>
              <strong>{items.length}</strong>
            </div>
            <div>
              <PencilFrame />
              <span>{t("dashboard.translations")}</span>
              <strong>
                {items.reduce(
                  (n, item) =>
                    n +
                    Object.values(item.translations).filter((v) => v.title)
                      .length,
                  0,
                )}
              </strong>
            </div>
          </div>
          <section className={styles.section}>
            <h2>{t("dashboard.continue")}</h2>
            <ul className={styles.list}>
              {items.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <h3>
                    {item.translations[locale]?.title || t("articles.untitled")}
                  </h3>
                  <Link href={`/admin/articles/${item.id}/edit`}>
                    {t("edit")} ↗
                  </Link>
                </li>
              ))}
            </ul>
            {!items.length && (
              <p className={styles.empty}>{t("articles.empty")}</p>
            )}
          </section>
        </>
      ) : (
        <LoadingSkeleton variant="cards" />
      )}
    </>
  );
}
