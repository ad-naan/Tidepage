"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/shared/i18n/navigation";
import { localeRegistry, type Locale } from "@/shared/i18n/config";
import { Input } from "@/shared/ui/field/Input";
import { Button } from "@/shared/ui/button/Button";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import { apiSend } from "@/shared/http/client";
import type { ArticleDraft } from "@/modules/content/domain/editor-document";
import { EditorialDeleteDialog } from "./EditorialDeleteDialog";
import styles from "./admin.module.css";

type Publication = { id: string; slug: string; locale: Locale; title: string };
type Row = {
  id: string;
  title: string;
  draft?: ArticleDraft;
  versions: Publication[];
};

export function ArticleManagerView({
  initialItems,
  published,
}: {
  initialItems: ArticleDraft[];
  published: Publication[];
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const { notify } = useNotice();
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [view, setView] = useState("active");
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const rows = new Map<string, Row>();
  for (const version of published) {
    const row = rows.get(version.id) ?? {
      id: version.id,
      title: version.title,
      versions: [],
    };
    row.versions.push(version);
    if (version.locale === locale) row.title = version.title;
    rows.set(row.id, row);
  }
  for (const item of items) {
    const row = rows.get(item.id) ?? { id: item.id, title: "", versions: [] };
    const primary = item.translations[locale]?.title;
    row.title =
      primary ||
      row.title ||
      Object.values(item.translations).find(({ title }) => title)?.title ||
      t("articles.untitled");
    row.draft = item;
    rows.set(row.id, row);
  }
  const all = [...rows.values()];
  const activeCount = all.filter(({ draft }) => !draft?.deletedAt).length;
  const term = query.trim().toLowerCase();
  const visible = all.filter(
    (row) =>
      !!row.draft?.deletedAt === (view === "trash") &&
      [
        row.title,
        ...row.versions.map(({ title }) => title),
        ...Object.values(row.draft?.translations ?? {}).map(
          ({ title }) => title,
        ),
      ].some((title) => title.toLowerCase().includes(term)),
  );

  async function changeStatus(row: Row, remove: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const { item } = await apiSend<{ item: ArticleDraft }>(
        "/api/v1/editorial-trash",
        "POST",
        {
          kind: "articles",
          id: row.id,
          revision: row.draft?.revision ?? 0,
          remove,
        },
      );
      setItems((current) => [
        item,
        ...current.filter((entry) => entry.id !== item.id),
      ]);
      setDeleting(null);
      notify({
        title: t(remove ? "crud.moved" : "crud.restored"),
        tone: "success",
      });
      router.refresh();
    } catch {
      notify({ title: t("editorialList.actionFailed"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className={styles.heading}>
        <div>
          <h1>{t("nav.articles")}</h1>
          <p>{t("editorialList.description")}</p>
        </div>
        <div className={styles.actions}>
          <Link href="/admin/articles/new">{t("articles.new")} ↗</Link>
        </div>
      </header>
      <Input
        aria-label={t("articles.search")}
        placeholder={t("articles.search")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <FilterTabs
        label={t("crud.filter")}
        value={view}
        onChange={setView}
        options={[
          {
            value: "active",
            label: t("editorialList.all"),
            count: activeCount,
          },
          {
            value: "trash",
            label: t("crud.trash"),
            count: all.length - activeCount,
          },
        ]}
      />
      <ul className={styles.list}>
        {visible.map((row) => (
          <li key={row.id}>
            <div>
              <h2>{row.title}</h2>
              <p>
                {row.draft?.deletedAt
                  ? t("editorialList.deleted")
                  : row.versions.length
                    ? t("collection.publishedLanguages", {
                        languages: row.versions
                          .map(({ locale }) => localeRegistry[locale].name)
                          .join(" / "),
                      })
                    : t("editorialList.draft")}
              </p>
            </div>
            <div className={styles.actions}>
              {row.draft?.deletedAt ? (
                <Button
                  busy={busy}
                  onClick={() => void changeStatus(row, false)}
                >
                  {t("crud.restore")}
                </Button>
              ) : (
                <>
                  <Link
                    href={
                      row.draft
                        ? `/admin/articles/${row.id}/edit`
                        : `/admin/articles/import/${row.versions[0].slug}`
                    }
                  >
                    {t("edit")} ↗
                  </Link>
                  <Button
                    className={styles.deleteButton}
                    disabled={busy}
                    onClick={() => setDeleting(row)}
                  >
                    {t("editorialList.delete")}
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!visible.length && (
        <p className={styles.empty}>{t("editorialList.empty")}</p>
      )}
      {deleting && (
        <EditorialDeleteDialog
          name={deleting.title}
          busy={busy}
          onClose={() => setDeleting(null)}
          onDelete={() => void changeStatus(deleting, true)}
        />
      )}
    </>
  );
}
