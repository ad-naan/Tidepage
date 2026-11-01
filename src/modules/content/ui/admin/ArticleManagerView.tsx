"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/shared/i18n/navigation";
import { Input } from "@/shared/ui/field/Input";
import { Button } from "@/shared/ui/button/Button";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import type { ArticleDraft } from "@/modules/content/domain/editor-document";
import type { ArticleSummary } from "@/modules/content/domain/models";
import { loadArticleDrafts, saveArticleDraft } from "./draft-store";
import styles from "./admin.module.css";
export function ArticleManagerView({
  published = [],
}: {
  published?: ArticleSummary[];
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [items, setItems] = useState<ArticleDraft[]>([]);
  const [query, setQuery] = useState("");
  const [state, setState] = useState("loading");
  const [view, setView] = useState("active");
  const [deleting, setDeleting] = useState<ArticleDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const { notify } = useNotice();
  async function changeStatus(item: ArticleDraft, remove: boolean) {
    setBusy(true);
    try {
      const saved = await saveArticleDraft({
        ...item,
        deletedAt: remove ? new Date().toISOString() : undefined,
      });
      setItems((current) =>
        current.map((value) => (value.id === saved.id ? saved : value)),
      );
      setDeleting(null);
      notify({
        title: t(remove ? "crud.moved" : "crud.restored"),
        tone: "success",
      });
    } catch {
      notify({ title: t("editor.conflict"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }
  const load = () => {
    setState("loading");
    loadArticleDrafts(true)
      .then((items) => {
        setItems(items);
        setState("ready");
      })
      .catch(() => setState("error"));
  };
  useEffect(load, []);
  return (
    <>
      <header className={styles.heading}>
        <div>
          <h1>{t("nav.articles")}</h1>
          <p>{t("articles.description")}</p>
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
            label: t("crud.active"),
            count: items.filter((item) => !item.deletedAt).length,
          },
          {
            value: "trash",
            label: t("crud.trash"),
            count: items.filter((item) => !!item.deletedAt).length,
          },
        ]}
      />
      {state === "loading" && <p role="status">{t("loading")}</p>}
      {state === "error" && (
        <div role="alert">
          <p>{t("storageError")}</p>
          <Button onClick={load}>{t("retry")}</Button>
        </div>
      )}
      {state === "ready" && (
        <ul className={styles.list}>
          {items
            .filter(
              (item) =>
                (view === "trash" ? !!item.deletedAt : !item.deletedAt) &&
                Object.values(item.translations).some((value) =>
                  value.title.toLowerCase().includes(query.toLowerCase()),
                ),
            )
            .map((item) => (
              <li key={item.id}>
                <div>
                  <h2>
                    {item.translations[locale]?.title || t("articles.untitled")}
                  </h2>
                  <p>
                    {t("articles.localDraft")} ·{" "}
                    {Object.entries(item.translations)
                      .filter(([, v]) => v.title)
                      .map(([key]) => key)
                      .join(" / ")}{" "}
                    · {new Date(item.updatedAt).toLocaleDateString(locale)}
                  </p>
                </div>
                <div className={styles.actions}>
                  {item.deletedAt ? (
                    <Button
                      variant="quiet"
                      busy={busy}
                      onClick={() => changeStatus(item, false)}
                    >
                      {t("crud.restore")}
                    </Button>
                  ) : (
                    <>
                      <Link href={`/admin/articles/${item.id}/edit`}>
                        {t("edit")} ↗
                      </Link>
                      <Button disabled={busy} onClick={() => setDeleting(item)}>
                        {t("crud.delete")}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
        </ul>
      )}
      {state === "ready" && !items.length && (
        <p className={styles.empty}>{t("articles.empty")}</p>
      )}
      {view === "active" && (
        <section className={styles.section}>
          <h2>{t("articles.publishedSource")}</h2>
          <p className={styles.muted}>{t("articles.importHelp")}</p>
          <ul className={styles.list}>
            {published
              .filter((item) =>
                item.title.toLowerCase().includes(query.toLowerCase()),
              )
              .map((item) => (
                <li key={item.slug}>
                  <div>
                    <h2>{item.title}</h2>
                    <p>
                      {item.locale} · {item.date}
                    </p>
                  </div>
                  <Link href={`/admin/articles/import/${item.slug}`}>
                    {t("articles.import")} ↗
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
      {deleting && (
        <Dialog
          title={t("crud.deleteTitle")}
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <p>
            {t("crud.deleteHelp", {
              name:
                deleting.translations[locale]?.title || t("articles.untitled"),
            })}
          </p>
          <div className={styles.actions}>
            <Button
              variant="quiet"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              {t("crud.cancel")}
            </Button>
            <Button
              variant="primary"
              busy={busy}
              onClick={() => changeStatus(deleting, true)}
            >
              {t("crud.confirm")}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
