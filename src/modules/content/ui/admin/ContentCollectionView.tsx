"use client";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { z } from "zod";
import { locales, localeRegistry, type Locale } from "@/shared/i18n/config";
import { updateWorkbenchRecord } from "@/shared/lib/workbench-store";
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
import {
  collectionTitleKey,
  managedItemSchema as itemSchema,
  type PublishedCollectionItem,
} from "@/modules/content/domain/managed-collections";
import { documentText } from "@/shared/contracts/rich-text";
import { NoteImagesEditor } from "./NoteImagesEditor";
import { EditorialDeleteDialog } from "./EditorialDeleteDialog";
import { apiGet, apiSend } from "@/shared/http/client";
import {
  galleryCategories,
  galleryCategorySchema,
} from "@/modules/content/domain/gallery";
import { dateKey } from "@/shared/lib/date-time";
const fields = {
  notes: ["text", "mood", "tag"],
  projects: ["name", "subtitle", "description", "status", "stack"],
  quotes: ["text", "author"],
  gallery: ["title", "description", "alt", "location"],
} as const;
type Item = z.infer<typeof itemSchema>;
type DeleteTarget = { id: string; revision: number; title: string };
const CollectionDocumentField = dynamic(
  () => import("./CollectionDocumentField"),
  {
    loading: () => <LoadingSkeleton variant="document" />,
  },
);
export function ContentCollectionView({
  kind,
  initialItems,
  initialPublished,
  canPublish,
}: {
  kind: Collection;
  initialItems: Item[];
  initialPublished: PublishedCollectionItem[];
  canPublish: boolean;
}) {
  const t = useTranslations("admin");
  const gallery = useTranslations("gallery");
  const copy = useMessages().admin;
  const uiLocale = useLocale();
  const { notify } = useNotice();
  const [items, setItems] = useState(initialItems);
  const [published, setPublished] = useState(initialPublished);
  const [value, setValue] = useState<Item | null>(null);
  const [locale, setLocale] = useState<Locale>(uiLocale);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [media, setMedia] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState("active");
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const draftIds = new Set(items.map((item) => item.id));
  const publishedOnly = published.filter((item) => !draftIds.has(item.id));
  const publishedById = new Map(
    published.map((item) => [item.id, item.titles]),
  );
  const shownDrafts = items.filter(
    (item) => !!item.deletedAt === (view === "trash"),
  );
  const titleKey = collectionTitleKey[kind];
  const titleFor = (item: Item) =>
    item.translations[uiLocale]?.[titleKey] ||
    locales.map((code) => item.translations[code]?.[titleKey]).find(Boolean) ||
    t("articles.untitled");
  const languageNames = (titles: PublishedCollectionItem["titles"]) =>
    locales
      .filter((code) => code in titles)
      .map((code) => localeRegistry[code].name)
      .join(" / ");
  function edit(item: Item) {
    setLocale(
      item.translations[uiLocale]?.[titleKey]
        ? uiLocale
        : (locales.find((code) => item.translations[code]?.[titleKey]) ??
            uiLocale),
    );
    setValue(item);
    setDirty(false);
  }
  async function openPublished(id: string) {
    if (opening || kind === "gallery") return;
    setOpening(id);
    setError("");
    try {
      const query = new URLSearchParams({ id });
      edit(
        itemSchema.parse(await apiGet(`/api/v1/collections/${kind}?${query}`)),
      );
    } catch {
      setError(t("storageError"));
    } finally {
      setOpening(null);
    }
  }
  async function changeStatus(
    target: Pick<DeleteTarget, "id" | "revision">,
    remove: boolean,
  ) {
    if (busy) return;
    setBusy(true);
    try {
      if (kind !== "gallery") {
        const { item, changed } = await apiSend<{
          item: Item;
          changed: { locale: Locale }[];
        }>("/api/v1/editorial-trash", "POST", {
          kind,
          id: target.id,
          revision: target.revision,
          remove,
        });
        setItems((current) => [
          item,
          ...current.filter(({ id }) => id !== item.id),
        ]);
        if (remove || changed.length)
          setPublished((current) => {
            const remaining = current.filter(({ id }) => id !== item.id);
            const titles = Object.fromEntries(
              changed.map(({ locale }) => [
                locale,
                item.translations[locale]?.[titleKey] ?? "",
              ]),
            );
            return remove ? remaining : [...remaining, { id: item.id, titles }];
          });
      } else {
        const next = await updateWorkbenchRecord(
          `collection:${kind}`,
          (raw) => {
            const current =
              raw === undefined ? [] : itemSchema.array().parse(raw);
            const existing = current.find((value) => value.id === target.id);
            if (!existing || existing.revision !== target.revision)
              throw new Error("CONFLICT");
            const saved = {
              ...existing,
              deletedAt: remove ? new Date().toISOString() : undefined,
              revision: existing.revision + 1,
              updatedAt: new Date().toISOString(),
            };
            return current.map((value) =>
              value.id === target.id ? saved : value,
            );
          },
        );
        setItems(next);
      }
      setDeleting(null);
      notify({
        title: t(remove ? "crud.moved" : "crud.restored"),
        tone: "success",
      });
    } catch {
      setError(t("editorialList.actionFailed"));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!value) return;
    setBusy(true);
    try {
      const next = await updateWorkbenchRecord(`collection:${kind}`, (raw) => {
        const current = raw === undefined ? [] : itemSchema.array().parse(raw);
        const previous = current.find((item) => item.id === value.id);
        if ((previous?.revision ?? 0) !== value.revision)
          throw new Error("DRAFT_CONFLICT");
        const saved = itemSchema.parse({
          ...value,
          category:
            kind === "gallery"
              ? (galleryCategorySchema.safeParse(value.category).data ??
                galleryCategories[0])
              : value.category,
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
  async function publishCollection() {
    if (
      !value ||
      dirty ||
      uploading ||
      busy ||
      !canPublish ||
      kind === "gallery"
    )
      return;
    setBusy(true);
    try {
      await apiSend(
        kind === "notes" ? "/api/v1/notes" : `/api/v1/collections/${kind}`,
        "POST",
        {
          id: value.id,
          locale,
          revision: value.revision,
        },
      );
      const titles = {
        ...publishedById.get(value.id),
        [locale]: value.translations[locale]?.[titleKey] ?? "",
      };
      setPublished((current) => [
        { id: value.id, titles },
        ...current.filter((item) => item.id !== value.id),
      ]);
      notify({ title: t("collection.published"), tone: "success" });
      setError("");
    } catch {
      setError(t("collection.publishFailed"));
    } finally {
      setBusy(false);
    }
  }
  async function publishPhoto(visible: boolean) {
    if (!value || dirty || busy || !value.revision) return;
    setBusy(true);
    try {
      await apiSend("/api/v1/gallery", visible ? "POST" : "DELETE", {
        id: value.id,
        locale,
        revision: value.revision,
      });
      notify({
        title: gallery(visible ? "published" : "unpublished"),
        tone: "success",
      });
      setError("");
    } catch {
      setError(gallery("publishError"));
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
          <p>
            {t(
              kind === "gallery"
                ? "collection.description"
                : "editorialList.description",
            )}
          </p>
        </div>
        <Button
          disabled={!!value || !!opening}
          variant="quiet"
          onClick={() => {
            setLocale(uiLocale);
            setValue({
              id: crypto.randomUUID(),
              revision: 0,
              updatedAt: new Date().toISOString(),
              sortOrder: 0,
              publishedOn: kind === "gallery" ? dateKey(new Date()) : "",
              category: kind === "gallery" ? galleryCategories[0] : "",
              sketch: "boat",
              color: "sand",
              assetId: "",
              images: {},
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
              label: t("editorialList.all"),
              count:
                items.filter((item) => !item.deletedAt).length +
                publishedOnly.length,
            },
            {
              value: "trash",
              label: t("crud.trash"),
              count: items.filter((item) => !!item.deletedAt).length,
            },
          ]}
        />
      )}
      {!value && (
        <ul className={styles.list}>
          {shownDrafts.map((item) => (
            <li key={item.id}>
              <div>
                <h2>{titleFor(item)}</h2>
                <p>
                  {item.deletedAt
                    ? t("editorialList.deleted")
                    : publishedById.has(item.id)
                      ? t("collection.publishedLanguages", {
                          languages: languageNames(publishedById.get(item.id)!),
                        })
                      : t("editorialList.draft")}
                </p>
              </div>
              <div className={styles.actions}>
                {item.deletedAt ? (
                  <Button busy={busy} onClick={() => changeStatus(item, false)}>
                    {t("crud.restore")}
                  </Button>
                ) : (
                  <>
                    <Button disabled={!!opening} onClick={() => edit(item)}>
                      {t("edit")}
                    </Button>
                    <Button
                      className={styles.deleteButton}
                      disabled={busy || !!opening}
                      onClick={() =>
                        setDeleting({
                          id: item.id,
                          revision: item.revision,
                          title: titleFor(item),
                        })
                      }
                    >
                      {t("editorialList.delete")}
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
          {view !== "trash" &&
            publishedOnly.map(({ id, titles }) => (
              <li key={id}>
                <div>
                  <h2>
                    {titles[uiLocale] ||
                      locales.map((code) => titles[code]).find(Boolean) ||
                      t("articles.untitled")}
                  </h2>
                  <p>
                    {t("collection.publishedLanguages", {
                      languages: languageNames(titles),
                    })}
                  </p>
                </div>
                <div className={styles.actions}>
                  <Button
                    busy={opening === id}
                    disabled={opening !== null && opening !== id}
                    onClick={() => void openPublished(id)}
                  >
                    {t("edit")}
                  </Button>
                  <Button
                    className={styles.deleteButton}
                    disabled={busy || !!opening}
                    onClick={() =>
                      setDeleting({
                        id,
                        revision: 0,
                        title:
                          titles[uiLocale] ||
                          locales.map((code) => titles[code]).find(Boolean) ||
                          t("articles.untitled"),
                      })
                    }
                  >
                    {t("editorialList.delete")}
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      )}
      {!value &&
        !shownDrafts.length &&
        (view === "trash" || !publishedOnly.length) && (
          <p className={styles.empty}>{t("editorialList.empty")}</p>
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
                disabled={uploading || busy}
                onClick={() => {
                  setValue(null);
                  setDirty(false);
                }}
              >
                {t("collection.discard")}
              </Button>
              <Button
                variant="primary"
                busy={busy}
                disabled={uploading}
                onClick={save}
              >
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
              disabled={uploading}
            />
            {fields[kind]
              .filter(
                (key) =>
                  !(
                    kind === "notes" &&
                    key === "text" &&
                    value.documents?.[locale]
                  ),
              )
              .map((key) => (
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
            {value.documents?.[locale] && (
              <CollectionDocumentField
                key={`${value.id}:${locale}`}
                label={t("editor.fields.body")}
                value={value.documents[locale]}
                onUploading={setUploading}
                onChange={(body) =>
                  update({
                    documents: { ...value.documents, [locale]: body },
                    ...(kind === "notes" && {
                      translations: {
                        ...value.translations,
                        [locale]: {
                          ...value.translations[locale],
                          text: documentText(body),
                        },
                      },
                    }),
                  })
                }
              />
            )}
            {kind === "notes" && (
              <NoteImagesEditor
                key={value.id + locale}
                images={value.images[locale] ?? []}
                onChange={(images) =>
                  update({ images: { ...value.images, [locale]: images } })
                }
                onBusyChange={setUploading}
              />
            )}
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
              {kind === "gallery" ? (
                <Field id="collection-category" label={labels.category}>
                  <Select
                    label={labels.category}
                    value={
                      galleryCategorySchema.safeParse(value.category).data ??
                      galleryCategories[0]
                    }
                    options={galleryCategories.map((value) => ({
                      value,
                      label: gallery(`tabs.${value}`),
                    }))}
                    onValueChange={(category) => update({ category })}
                  />
                </Field>
              ) : (
                kind !== "quotes" && (
                  <Field id="collection-category" label={labels.category}>
                    <Input
                      value={value.category}
                      onChange={(e) => update({ category: e.target.value })}
                    />
                  </Field>
                )
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
              <Button
                variant="primary"
                busy={busy}
                disabled={uploading}
                onClick={save}
              >
                {t("editor.save")}
              </Button>
              <Button
                disabled={uploading || busy}
                onClick={() => {
                  setValue(null);
                  setDirty(false);
                }}
              >
                {t("collection.discard")}
              </Button>
            </div>
            {kind !== "gallery" && canPublish ? (
              <>
                <Button
                  variant="primary"
                  busy={busy}
                  disabled={dirty || uploading || !value.revision}
                  onClick={() => void publishCollection()}
                >
                  {t("collection.publish")}
                </Button>
                <p className={styles.muted}>{t("collection.publishHelp")}</p>
              </>
            ) : kind === "gallery" ? (
              <>
                <div className={styles.actions}>
                  <Button
                    variant="primary"
                    busy={busy}
                    disabled={dirty || !value.revision || !value.assetId}
                    onClick={() => void publishPhoto(true)}
                  >
                    {gallery("publish")}
                  </Button>
                  <Button
                    disabled={dirty || busy || !value.revision}
                    onClick={() => void publishPhoto(false)}
                  >
                    {gallery("unpublish")}
                  </Button>
                </div>
                <p className={styles.muted}>{gallery("publishHelp")}</p>
              </>
            ) : (
              <p className={styles.muted}>{t("editor.publishUnavailable")}</p>
            )}
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
        <EditorialDeleteDialog
          name={deleting.title}
          busy={busy}
          draftOnly={kind === "gallery"}
          onClose={() => setDeleting(null)}
          onDelete={() => void changeStatus(deleting, true)}
        />
      )}
    </>
  );
}
