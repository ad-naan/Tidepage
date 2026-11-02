"use client";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
import { useEffect, useState } from "react";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { z } from "zod";
import { locales, localeRegistry, type Locale } from "@/shared/i18n/config";
import {
  readWorkbenchRecord,
  updateWorkbenchRecord,
} from "@/shared/lib/workbench-store";
import { Field } from "@/shared/ui/field/Field";
import { Input } from "@/shared/ui/field/Input";
import { DatePicker } from "@/shared/ui/date-picker/DatePicker";
import { UnsavedChangesGuard } from "@/shared/ui/navigation/UnsavedChangesGuard";
import { AssetImage } from "@/modules/media/ui/admin/AssetImage";
import { Textarea } from "@/shared/ui/field/Textarea";
import { Select } from "@/shared/ui/select/Select";
import { Button } from "@/shared/ui/button/Button";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import { MediaPicker } from "@/modules/media/ui/admin/MediaPicker";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import styles from "./admin.module.css";
import type { Collection } from "@/modules/content/domain/managed-collections";
import { managedItemSchema as itemSchema } from "@/modules/content/domain/managed-collections";
const fields = {
  notes: ["text", "mood", "tag"],
  projects: ["name", "subtitle", "description", "status", "stack"],
  quotes: ["text", "author"],
  gallery: ["title", "description", "alt", "location"],
} as const;
type Item = z.infer<typeof itemSchema>;
export function ContentCollectionView({ kind }: { kind: Collection }) {
  const t = useTranslations("admin");
  const copy = useMessages().admin;
  const uiLocale = useLocale();
  const { notify } = useNotice();
  const [items, setItems] = useState<Item[]>([]);
  const [value, setValue] = useState<Item | null>(null);
  const [locale, setLocale] = useState<Locale>(uiLocale);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [media, setMedia] = useState(false);
  const [view, setView] = useState("active");
  const [deleting, setDeleting] = useState<Item | null>(null);
  async function changeStatus(item: Item, remove: boolean) {
    setBusy(true);
    try {
      const next = await updateWorkbenchRecord(`collection:${kind}`, (raw) => {
        const current = raw === undefined ? [] : itemSchema.array().parse(raw);
        const existing = current.find((value) => value.id === item.id);
        if (!existing || existing.revision !== item.revision)
          throw new Error("CONFLICT");
        const saved = {
          ...item,
          deletedAt: remove ? new Date().toISOString() : undefined,
          revision: item.revision + 1,
          updatedAt: new Date().toISOString(),
        };
        return current.map((value) => (value.id === item.id ? saved : value));
      });
      setItems(next);
      setDeleting(null);
      notify({
        title: t(remove ? "crud.moved" : "crud.restored"),
        tone: "success",
      });
    } catch {
      setError(t("editor.conflict"));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    readWorkbenchRecord(`collection:${kind}`)
      .then((data) => {
        setItems(data === undefined ? [] : itemSchema.array().parse(data));
        setReady(true);
      })
      .catch(() => setError(t("storageError")));
  }, [kind]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  async function save() {
    if (!value) return;
    setBusy(true);
    try {
      const next = await updateWorkbenchRecord(`collection:${kind}`, (raw) => {
        const current = raw === undefined ? [] : itemSchema.array().parse(raw);
        const previous = current.find((item) => item.id === value.id);
        if (previous && previous.revision !== value.revision)
          throw new Error("DRAFT_CONFLICT");
        const saved = itemSchema.parse({
          ...value,
          revision: value.revision + 1,
          updatedAt: new Date().toISOString(),
        });
        return [saved, ...current.filter((item) => item.id !== saved.id)];
      });
      setItems(next);
      setValue(next[0]);
      setDirty(false);
      notify({ title: t("editor.savedLocal"), tone: "success" });
      setError("");
    } catch {
      setError(t("editor.conflict"));
    } finally {
      setBusy(false);
    }
  }
  const update = (patch: Partial<Item>) => {
    if (value) {
      setValue({ ...value, ...patch });
      setDirty(true);
    }
  };
  const labels = copy.collection.fields as Record<string, string>;
  return (
    <>
      <UnsavedChangesGuard dirty={dirty} />
      <header className={styles.heading}>
        <div>
          <h1>{t(`nav.${kind}`)}</h1>
          <p>{t("collection.description")}</p>
        </div>
        <Button
          disabled={!!value}
          variant="quiet"
          onClick={() => {
            setValue({
              id: crypto.randomUUID(),
              revision: 0,
              updatedAt: new Date().toISOString(),
              sortOrder: 0,
              publishedOn: "",
              category: "",
              sketch: "boat",
              color: "sand",
              assetId: "",
              translations: Object.fromEntries(
                locales.map((locale) => [locale, {}]),
              ),
            });
            setDirty(false);
          }}
        >
          {t("collection.new")}
        </Button>
      </header>
      {error && <p role="alert">{error}</p>}
      {!value && (
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
      )}
      {!ready && !error && <LoadingSkeleton variant="rows" />}
      {!value && (
        <ul className={styles.list}>
          {items
            .filter((item) =>
              view === "trash" ? !!item.deletedAt : !item.deletedAt,
            )
            .map((item) => (
              <li key={item.id}>
                <h2>
                  {Object.values(item.translations[uiLocale] ?? {})[0] ||
                    t("articles.untitled")}
                </h2>
                <div className={styles.actions}>
                  {item.deletedAt ? (
                    <Button
                      busy={busy}
                      onClick={() => changeStatus(item, false)}
                    >
                      {t("crud.restore")}
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => {
                          setValue(item);
                          setDirty(false);
                        }}
                      >
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
      )}
      {!value && ready && !items.length && (
        <p className={styles.empty}>{t("collection.empty")}</p>
      )}
      {value && (
        <section
          className={styles.collectionEditor}
          aria-label={t(`nav.${kind}`)}
        >
          <div className={styles.collectionTop}>
            <h2>{t("edit")}</h2>
            <div className={styles.actions}>
              <Button
                variant="quiet"
                onClick={() => {
                  setValue(null);
                  setDirty(false);
                }}
              >
                {t("collection.discard")}
              </Button>
              <Button variant="primary" busy={busy} onClick={save}>
                {t("editor.save")}
              </Button>
            </div>
          </div>
          <div className={styles.fields}>
            <Select
              label={t("editor.contentLocale")}
              value={locale}
              options={locales.map((value) => ({
                value,
                label: localeRegistry[value].name,
              }))}
              onValueChange={setLocale}
            />
            {fields[kind].map((key) => (
              <Field
                key={`${locale}:${key}`}
                id={`collection-${key}`}
                label={labels[key]}
              >
                {["text", "description"].includes(key) ? (
                  <Textarea
                    rows={4}
                    value={value.translations[locale]?.[key] ?? ""}
                    onChange={(e) =>
                      update({
                        translations: {
                          ...value.translations,
                          [locale]: {
                            ...value.translations[locale],
                            [key]: e.target.value,
                          },
                        },
                      })
                    }
                  />
                ) : (
                  <Input
                    value={value.translations[locale]?.[key] ?? ""}
                    onChange={(e) =>
                      update({
                        translations: {
                          ...value.translations,
                          [locale]: {
                            ...value.translations[locale],
                            [key]: e.target.value,
                          },
                        },
                      })
                    }
                  />
                )}
              </Field>
            ))}
            <div className={styles.row}>
              <Field id="collection-date" label={labels.publishedOn}>
                <DatePicker
                  label={labels.publishedOn}
                  value={value.publishedOn}
                  onValueChange={(publishedOn) => update({ publishedOn })}
                />
              </Field>
              <Field id="collection-sort" label={labels.sortOrder}>
                <Input
                  type="number"
                  value={value.sortOrder}
                  onChange={(e) =>
                    update({ sortOrder: Number(e.target.value) })
                  }
                />
              </Field>
              {kind !== "quotes" && (
                <Field id="collection-category" label={labels.category}>
                  <Input
                    value={value.category}
                    onChange={(e) => update({ category: e.target.value })}
                  />
                </Field>
              )}
              {(kind === "projects" || kind === "notes") && (
                <Field id="collection-sketch" label={t("editor.fields.sketch")}>
                  <Select
                    label={t("editor.fields.sketch")}
                    value={value.sketch}
                    options={["sun", "mountain", "boat", "tree"].map(
                      (value) => ({
                        value,
                        label: (copy.sketches as Record<string, string>)[value],
                      }),
                    )}
                    onValueChange={(sketch) => update({ sketch })}
                  />
                </Field>
              )}
              {kind === "projects" && (
                <Field id="collection-color" label={labels.color}>
                  <Select
                    label={labels.color}
                    value={value.color}
                    options={["sand", "sage", "peach"].map((value) => ({
                      value,
                      label: (copy.colors as Record<string, string>)[value],
                    }))}
                    onValueChange={(color) => update({ color })}
                  />
                </Field>
              )}
            </div>
            {kind === "gallery" && (
              <>
                <Button variant="quiet" onClick={() => setMedia(true)}>
                  {t("editor.cover")}
                </Button>
                {value.assetId && (
                  <AssetImage
                    id={value.assetId}
                    alt={value.translations[locale]?.alt ?? ""}
                  />
                )}
              </>
            )}
            <div className={styles.actions}>
              <Button variant="primary" busy={busy} onClick={save}>
                {t("editor.save")}
              </Button>
              <Button
                onClick={() => {
                  setValue(null);
                  setDirty(false);
                }}
              >
                {t("collection.discard")}
              </Button>
            </div>
            <p className={styles.muted}>{t("editor.publishUnavailable")}</p>
          </div>
        </section>
      )}
      {media && (
        <Dialog title={t("nav.media")} wide onClose={() => setMedia(false)}>
          <MediaPicker
            onSelect={(asset, alt) => {
              update({
                assetId: asset.id,
                translations: {
                  ...value!.translations,
                  [locale]: { ...value!.translations[locale], alt },
                },
              });
              setMedia(false);
            }}
          />
        </Dialog>
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
                Object.values(deleting.translations[uiLocale] ?? {})[0] ||
                t("articles.untitled"),
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
