"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { friendDraftSchema as schema } from "@/modules/friends/domain/models";
import { locales, localeRegistry, type Locale } from "@/shared/i18n/config";
import { updateWorkbenchRecord } from "@/shared/lib/workbench-store";
import { apiSend } from "@/shared/http/client";
import { UnsavedChangesGuard } from "@/shared/ui/navigation/UnsavedChangesGuard";
import { PageHeader } from "@/shared/ui/page-header/PageHeader";
import { Field } from "@/shared/ui/field/Field";
import { Input } from "@/shared/ui/field/Input";
import { Textarea } from "@/shared/ui/field/Textarea";
import { Select } from "@/shared/ui/select/Select";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import { Button } from "@/shared/ui/button/Button";
import { ActionBar } from "@/shared/ui/action-bar/ActionBar";
import { ConfirmDialog } from "@/shared/ui/dialog/ConfirmDialog";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import styles from "./FriendsManagerView.module.css";
type Item = z.infer<typeof schema>;
type Publication = { id: string; locale: Locale };
export function FriendsManagerView({
  initialItems,
  initialPublished,
  canPublish,
}: {
  initialItems: Item[];
  initialPublished: Publication[];
  canPublish: boolean;
}) {
  const t = useTranslations("admin");
  const ft = useTranslations("friends");
  const uiLocale = useLocale();
  const { notify } = useNotice();
  const [locale, setLocale] = useState<Locale>(uiLocale);
  const [items, setItems] = useState(initialItems);
  const [published, setPublished] = useState(initialPublished);
  const [value, setValue] = useState<Item | null>(null);
  const [view, setView] = useState("active");
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saved = value && items.find((item) => item.id === value.id);
  const editingDirty = !!value && value !== saved;
  const visible =
    !!value &&
    published.some((entry) => entry.id === value.id && entry.locale === locale);
  const shownItems = items.filter(
    (item) => !!item.deletedAt === (view === "trash"),
  );
  const name = (item: Item) =>
    item.translations[uiLocale]?.name ||
    locales.map((code) => item.translations[code]?.name).find(Boolean) ||
    t("articles.untitled");
  async function persist(item: Item, keepEditing = false) {
    if (busy) return;
    setBusy(true);
    try {
      const checked = schema.parse(item);
      const next = await updateWorkbenchRecord("friends", (raw) => {
        const current = raw === undefined ? [] : schema.array().parse(raw);
        const previous = current.find((v) => v.id === checked.id);
        if ((previous?.revision ?? 0) !== checked.revision)
          throw new Error("CONFLICT");
        const saved = { ...checked, revision: checked.revision + 1 };
        return [saved, ...current.filter((v) => v.id !== saved.id)];
      });
      setItems(next);
      setValue(keepEditing ? next[0] : null);
      setDeleting(null);
      setError("");
      notify({ title: t("editor.savedLocal"), tone: "success" });
    } catch {
      setError(t("friend.invalid"));
    } finally {
      setBusy(false);
    }
  }
  async function publish(visible: boolean) {
    if (!value || editingDirty || busy || !canPublish) return;
    setBusy(true);
    try {
      const { id, revision } = value;
      await apiSend("/api/v1/friends", visible ? "POST" : "DELETE", {
        id,
        locale,
        revision,
      });
      setPublished((current) => {
        const rest = current.filter(
          (entry) => entry.id !== id || entry.locale !== locale,
        );
        return visible ? [...rest, { id, locale }] : rest;
      });
      notify({
        title: t(visible ? "friend.published" : "friend.unpublished"),
        tone: "success",
      });
      setError("");
    } catch {
      setError(t("friend.publishError"));
    } finally {
      setBusy(false);
    }
  }
  const update = (patch: Partial<Item>) => {
    if (value && !busy) setValue({ ...value, ...patch });
  };
  return (
    <>
      <UnsavedChangesGuard dirty={editingDirty} />
      <PageHeader
        title={t("nav.friends")}
        description={t("friend.description")}
        actions={
          <Button
            variant="quiet"
            disabled={!!value}
            onClick={() => {
              setLocale(uiLocale);
              setValue({
                id: crypto.randomUUID(),
                revision: 0,
                url: "",
                category: "technology",
                sortOrder: 0,
                translations: Object.fromEntries(
                  locales.map((code) => [code, { name: "", description: "" }]),
                ),
              });
            }}
          >
            {t("collection.new")}
          </Button>
        }
      />
      {error && <p role="alert">{error}</p>}
      {value ? (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            if (editingDirty) void persist(value, true);
          }}
        >
          <ActionBar
            sticky
            context={
              <span role="status">
                {t(editingDirty ? "editor.unsaved" : "editor.localState")}
              </span>
            }
          >
            <Button
              variant="bare"
              disabled={busy}
              onClick={() => setValue(null)}
            >
              {t("collection.discard")}
            </Button>
            {canPublish && visible && (
              <Button
                variant="bare"
                disabled={editingDirty || busy}
                onClick={() => void publish(false)}
              >
                {t("friend.unpublish")}
              </Button>
            )}
            <Button
              variant={editingDirty ? "primary" : "quiet"}
              type="submit"
              disabled={busy || !editingDirty}
            >
              {t("editor.save")}
            </Button>
            {canPublish && (
              <Button
                variant={editingDirty ? "quiet" : "primary"}
                disabled={
                  busy ||
                  editingDirty ||
                  !value.translations[locale]?.name.trim()
                }
                onClick={() => void publish(true)}
              >
                {t("friend.publish")}
              </Button>
            )}
          </ActionBar>
          <Select
            value={locale}
            label={t("editor.contentLocale")}
            options={locales.map((value) => ({
              value,
              label: localeRegistry[value].name,
            }))}
            onValueChange={setLocale}
            disabled={busy}
          />
          <Field id="friend-name" label={t("friend.name")}>
            <Input
              value={value.translations[locale]?.name ?? ""}
              onChange={(e) =>
                update({
                  translations: {
                    ...value.translations,
                    [locale]: {
                      ...(value.translations[locale] ?? { description: "" }),
                      name: e.target.value,
                    },
                  },
                })
              }
            />
          </Field>
          <Field id="friend-description" label={t("friend.summary")}>
            <Textarea
              rows={3}
              value={value.translations[locale]?.description ?? ""}
              onChange={(e) =>
                update({
                  translations: {
                    ...value.translations,
                    [locale]: {
                      ...(value.translations[locale] ?? { name: "" }),
                      description: e.target.value,
                    },
                  },
                })
              }
            />
          </Field>
          <Field id="friend-url" label={t("friend.url")}>
            <Input
              type="url"
              value={value.url}
              onChange={(e) => update({ url: e.target.value })}
            />
          </Field>
          <div className={styles.row}>
            <Select
              value={value.category}
              label={t("editor.fields.category")}
              options={(["technology", "design", "life"] as const).map(
                (value) => ({ value, label: ft(`categories.${value}`) }),
              )}
              onValueChange={(category) => update({ category })}
            />
            <Field id="friend-sort" label={t("collection.fields.sortOrder")}>
              <Input
                type="number"
                value={value.sortOrder}
                onChange={(e) => update({ sortOrder: Number(e.target.value) })}
              />
            </Field>
          </div>
        </form>
      ) : (
        <>
          <FilterTabs
            value={view}
            onChange={setView}
            label={t("crud.filter")}
            options={[
              { value: "active", label: t("crud.active") },
              { value: "trash", label: t("crud.trash") },
            ]}
          />
          <ul className={styles.list}>
            {shownItems.map((item) => (
              <li key={item.id}>
                <div>
                  <h2>{name(item)}</h2>
                  <p>{item.url}</p>
                  <p>
                    {published.some((entry) => entry.id === item.id)
                      ? t("collection.publishedLanguages", {
                          languages: locales
                            .filter((code) =>
                              published.some(
                                (entry) =>
                                  entry.id === item.id && entry.locale === code,
                              ),
                            )
                            .map((code) => localeRegistry[code].name)
                            .join(" / "),
                        })
                      : t("collection.draft")}
                  </p>
                </div>
                <div className={styles.actions}>
                  {item.deletedAt ? (
                    <Button
                      variant="quiet"
                      busy={busy}
                      onClick={() => persist({ ...item, deletedAt: undefined })}
                    >
                      {t("crud.restore")}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="quiet"
                        onClick={() => {
                          setLocale(
                            item.translations[uiLocale]?.name
                              ? uiLocale
                              : (locales.find(
                                  (code) => item.translations[code]?.name,
                                ) ?? uiLocale),
                          );
                          setValue(item);
                        }}
                      >
                        {t("edit")}
                      </Button>
                      <Button variant="quiet" onClick={() => setDeleting(item)}>
                        {t("crud.delete")}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {!shownItems.length && (
            <p className={styles.empty}>{t("collection.empty")}</p>
          )}
        </>
      )}
      {deleting && (
        <ConfirmDialog
          title={t("crud.deleteTitle")}
          description={t("crud.deleteHelp", { name: name(deleting) })}
          cancelLabel={t("crud.cancel")}
          confirmLabel={t("crud.confirm")}
          danger
          busy={busy}
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            void persist({ ...deleting, deletedAt: new Date().toISOString() })
          }
        />
      )}
    </>
  );
}
