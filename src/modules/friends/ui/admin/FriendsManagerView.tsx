"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { friendDraftSchema as schema } from "@/modules/friends/domain/models";
import { locales, localeRegistry, type Locale } from "@/shared/i18n/config";
import {
  readWorkbenchRecord,
  updateWorkbenchRecord,
} from "@/shared/lib/workbench-store";
import { PageHeader } from "@/shared/ui/page-header/PageHeader";
import { Field } from "@/shared/ui/field/Field";
import { Input } from "@/shared/ui/field/Input";
import { Textarea } from "@/shared/ui/field/Textarea";
import { Select } from "@/shared/ui/select/Select";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import { Button } from "@/shared/ui/button/Button";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import styles from "./FriendsManagerView.module.css";
type Item = z.infer<typeof schema>;
export function FriendsManagerView() {
  const t = useTranslations("admin");
  const ft = useTranslations("friends");
  const uiLocale = useLocale();
  const { notify } = useNotice();
  const [locale, setLocale] = useState<Locale>(uiLocale);
  const [items, setItems] = useState<Item[]>([]);
  const [value, setValue] = useState<Item | null>(null);
  const [view, setView] = useState("active");
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    readWorkbenchRecord("friends")
      .then((raw) =>
        setItems(raw === undefined ? [] : schema.array().parse(raw)),
      )
      .catch(() => setError(t("storageError")));
  }, []);
  async function persist(item: Item) {
    setBusy(true);
    try {
      const checked = schema.parse(item);
      const next = await updateWorkbenchRecord("friends", (raw) => {
        const current = raw === undefined ? [] : schema.array().parse(raw);
        const previous = current.find((v) => v.id === checked.id);
        if (previous && previous.revision !== checked.revision)
          throw new Error("CONFLICT");
        const saved = { ...checked, revision: checked.revision + 1 };
        return [saved, ...current.filter((v) => v.id !== saved.id)];
      });
      setItems(next);
      setValue(null);
      setDeleting(null);
      setError("");
      notify({ title: t("editor.savedLocal"), tone: "success" });
    } catch {
      setError(t("friend.invalid"));
    } finally {
      setBusy(false);
    }
  }
  const update = (patch: Partial<Item>) => {
    if (value) setValue({ ...value, ...patch });
  };
  return (
    <>
      <PageHeader
        title={t("nav.friends")}
        description={t("friend.description")}
        actions={
          <Button
            variant="quiet"
            disabled={!!value}
            onClick={() =>
              setValue({
                id: crypto.randomUUID(),
                revision: 0,
                url: "",
                category: "technology",
                sortOrder: 0,
                translations: Object.fromEntries(
                  locales.map((code) => [code, { name: "", description: "" }]),
                ),
              })
            }
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
            void persist(value);
          }}
        >
          <Select
            value={locale}
            label={t("editor.contentLocale")}
            options={locales.map((value) => ({
              value,
              label: localeRegistry[value].name,
            }))}
            onValueChange={setLocale}
          />
          <Field id="friend-name" label={t("friend.name")}>
            <Input
              value={value.translations[locale]?.name ?? ""}
              onChange={(e) =>
                update({
                  translations: {
                    ...value.translations,
                    [locale]: {
                      ...value.translations[locale],
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
                      ...value.translations[locale],
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
          <div className={styles.actions}>
            <Button variant="primary" type="submit" busy={busy}>
              {t("editor.save")}
            </Button>
            <Button onClick={() => setValue(null)}>
              {t("collection.discard")}
            </Button>
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
            {items
              .filter((item) =>
                view === "trash" ? !!item.deletedAt : !item.deletedAt,
              )
              .map((item) => (
                <li key={item.id}>
                  <div>
                    <h2>
                      {item.translations[uiLocale]?.name ||
                        t("articles.untitled")}
                    </h2>
                    <p>{item.url}</p>
                  </div>
                  <div className={styles.actions}>
                    {item.deletedAt ? (
                      <Button
                        busy={busy}
                        onClick={() =>
                          persist({ ...item, deletedAt: undefined })
                        }
                      >
                        {t("crud.restore")}
                      </Button>
                    ) : (
                      <>
                        <Button onClick={() => setValue(item)}>
                          {t("edit")}
                        </Button>
                        <Button onClick={() => setDeleting(item)}>
                          {t("crud.delete")}
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
          </ul>
          {!items.length && (
            <p className={styles.empty}>{t("collection.empty")}</p>
          )}
        </>
      )}
      {deleting && (
        <Dialog title={t("crud.deleteTitle")} onClose={() => setDeleting(null)}>
          <p>
            {t("crud.deleteHelp", {
              name: deleting.translations[uiLocale]?.name || deleting.url,
            })}
          </p>
          <Button
            variant="primary"
            busy={busy}
            onClick={() =>
              persist({ ...deleting, deletedAt: new Date().toISOString() })
            }
          >
            {t("crud.confirm")}
          </Button>
        </Dialog>
      )}
    </>
  );
}
