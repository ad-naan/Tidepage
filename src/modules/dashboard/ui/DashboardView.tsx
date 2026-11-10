"use client";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
import { useEffect, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/shared/i18n/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  FilePlus2,
  FolderOpen,
  UsersRound,
} from "lucide-react";
import {
  PencilFrame,
  PencilLine,
  SketchLabel,
} from "@/shared/ui/drawing/CoastalMarks";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import { HanddrawnMark } from "@/shared/ui/drawing/HanddrawnMark";
import type { ArticleDraft } from "@/modules/content/domain/editor-document";
import { loadArticleDrafts } from "@/modules/content/ui/admin/draft-store";
import styles from "./DashboardView.module.css";
export function DashboardView({
  children,
  siteWide,
}: {
  children: ReactNode;
  siteWide: boolean;
}) {
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
    <div className={styles.dashboard}>
      <header className={styles.heading}>
        <PencilFrame kind="note" />
        <div>
          <SketchLabel kind="wind">{t("dashboard.label")}</SketchLabel>
          <h1>
            {t("dashboard.title")}
            <HanddrawnMark className={styles.underline} />
          </h1>
          <p>{t("dashboard.description")}</p>
        </div>
        <CoastalVignette kind="boat" className={styles.sketch} />
      </header>
      <nav className={styles.actions} aria-label={t("dashboard.shortcuts")}>
        <Link href="/admin/articles/new" className={styles.primary}>
          <FilePlus2 size={16} aria-hidden="true" /> {t("articles.new")}
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
        <Link href="/admin/articles">
          <FolderOpen size={16} aria-hidden="true" /> {t("nav.articles")}
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
        {siteWide && (
          <Link href="/admin/readers">
            <UsersRound size={16} aria-hidden="true" /> {t("nav.readers")}
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        )}
      </nav>
      {children}
      <PencilLine kind="fold" />
      {error ? (
        <p role="alert">{t("storageError")}</p>
      ) : items ? (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <h2>{t("dashboard.continue")}</h2>
            <p>
              {t("dashboard.drafts", { count: items.length })} ·{" "}
              {t("dashboard.translations", {
                count: items.reduce(
                  (n, item) =>
                    n +
                    Object.values(item.translations).filter((v) => v.title)
                      .length,
                  0,
                ),
              })}
            </p>
          </div>
          <ul className={styles.list}>
            {items.slice(0, 5).map((item) => (
              <li key={item.id}>
                <h3>
                  {item.translations[locale]?.title || t("articles.untitled")}
                </h3>
                <Link href={`/admin/articles/${item.id}/edit`}>
                  {t("edit")} <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          {!items.length && (
            <p className={styles.empty}>{t("articles.empty")}</p>
          )}
        </section>
      ) : (
        <LoadingSkeleton variant="cards" />
      )}
    </div>
  );
}
