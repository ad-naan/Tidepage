"use client";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Eye,
  SlidersHorizontal,
  Sparkles,
  X,
  Check,
  Circle,
} from "lucide-react";
import { Link } from "@/shared/i18n/navigation";
import type { Editor } from "@tiptap/core";
import { useLocale, useMessages, useTranslations } from "next-intl";
import {
  isLocale,
  locales,
  localeRegistry,
  type Locale,
} from "@/shared/i18n/config";
import {
  newArticle,
  translationOf,
  articleDraftSchema,
  publicationIssues,
  type ArticleDraft,
  type ArticleTranslation,
  type EditorNode,
} from "@/modules/content/domain/editor-document";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Input } from "@/shared/ui/field/Input";
import { DatePicker } from "@/shared/ui/date-picker/DatePicker";
import { Textarea } from "@/shared/ui/field/Textarea";
import { Field } from "@/shared/ui/field/Field";
import { Select } from "@/shared/ui/select/Select";
import { Disclosure } from "@/shared/ui/disclosure/Disclosure";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import { AssetImage } from "@/modules/media/ui/admin/AssetImage";
import { MediaPicker } from "@/modules/media/ui/admin/MediaPicker";
import { RichTextEditor } from "./editor/RichTextEditor";
import { RichText } from "@/modules/content/ui/rich-text/RichText";
import { loadArticleDrafts, saveArticleDraft } from "./draft-store";
import { imageUploader } from "@/modules/media/ui/admin/media-client";
import { apiSend, ApiClientError } from "@/shared/http/client";
import { ArticleAssistant } from "./ArticleAssistant";
import styles from "./ArticleEditorView.module.css";
export function ArticleEditorView({
  id,
  initialDraft,
  aiEnabled = false,
}: {
  id?: string;
  initialDraft?: ArticleDraft;
  aiEnabled?: boolean;
}) {
  const t = useTranslations("admin");
  const labels = useMessages().admin.editor.fields;
  const uiLocale = useLocale();
  const { notify } = useNotice();
  const [draft, setDraft] = useState<ArticleDraft | null>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLElement>(null);
  const loaded = !!draft;
  useLayoutEffect(() => {
    const element = header.current;
    if (!element) return;
    const measure = () =>
      workspace.current?.style.setProperty(
        "--editor-header-height",
        `${element.getBoundingClientRect().height}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [loaded]);
  const draftRef = useRef<ArticleDraft | null>(null);
  const [locale, setLocale] = useState<Locale>(uiLocale);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [panel, setPanel] = useState<"metadata" | "ai" | null>(null);
  const panelTriggers = useRef<
    Partial<Record<"metadata" | "ai", HTMLButtonElement>>
  >({});
  function closePanel() {
    if (panel) panelTriggers.current[panel]?.focus({ preventScroll: true });
    setPanel(null);
  }
  useEffect(() => {
    if (!panel) return;
    const escape = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        document.querySelector("dialog[open]")
      )
        return;
      event.preventDefault();
      closePanel();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [panel]);
  const [readyEditors, setReadyEditors] = useState<
    Partial<Record<Locale, Editor>>
  >({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [cover, setCover] = useState(false);
  const [checking, setChecking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const changes = useRef(0);
  const markDirty = useCallback(() => {
    changes.current++;
    dirtyRef.current = true;
    setDirty(true);
  }, []);
  const editors = useRef<Partial<Record<Locale, Editor>>>({});
  const editorReady = useMemo(
    () =>
      Object.fromEntries(
        locales.map((code) => [
          code,
          (editor: Editor | null) => {
            if (editor) editors.current[code] = editor;
            else delete editors.current[code];
            setReadyEditors({ ...editors.current });
          },
        ]),
      ) as Record<Locale, (editor: Editor | null) => void>,
    [],
  );
  function commit(value: ArticleDraft) {
    draftRef.current = value;
    setDraft(value);
  }
  useEffect(() => {
    let live = true;
    if (!id) {
      commit(newArticle(crypto.randomUUID()));
      return;
    }
    loadArticleDrafts()
      .then((items) => {
        if (!live) return;
        const value = items.find((item) => item.id === id) ?? initialDraft;
        if (value) commit(value);
        else setError(t("articles.notFound"));
      })
      .catch(() => {
        if (live) setError(t("storageError"));
      });
    return () => {
      live = false;
    };
  }, [id]);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const navigate = (event: MouseEvent) => {
      if (
        !dirtyRef.current ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("href")?.startsWith("#")
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setPendingLink(anchor.href);
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", navigate, true);
    };
  }, []);
  function snapshot() {
    const current = draftRef.current;
    if (!current) return null;
    const translations = { ...current.translations };
    for (const code of locales) {
      const editor = editors.current[code];
      if (editor)
        translations[code] = {
          ...translationOf(current, code),
          tags: translationOf(current, code)
            .tags.map((tag) => tag.trim())
            .filter(Boolean),
          body: editor.getJSON() as EditorNode,
        };
    }
    return { ...current, translations };
  }
  function updateShared(value: Partial<ArticleDraft>) {
    if (!draftRef.current) return;
    commit({ ...draftRef.current, ...value });
    markDirty();
  }
  function updateTranslation(value: Partial<ArticleTranslation>) {
    if (!draftRef.current) return;
    commit({
      ...draftRef.current,
      translations: {
        ...draftRef.current.translations,
        [locale]: { ...translationOf(draftRef.current, locale), ...value },
      },
    });
    markDirty();
  }
  async function save() {
    const value = snapshot();
    if (!value || uploading || saving || publishing) return;
    const validated = articleDraftSchema.safeParse(value);
    if (!validated.success) {
      setError(t("editor.invalidFields"));
      return;
    }
    setError("");
    setSaving(true);
    const version = changes.current;
    try {
      const saved = await saveArticleDraft(validated.data);
      if (version === changes.current) {
        commit(saved);
        dirtyRef.current = false;
        setDirty(false);
      } else if (draftRef.current) {
        commit({ ...draftRef.current, revision: saved.revision });
      }
      if (
        window.location.pathname.endsWith("/new") ||
        window.location.pathname.includes("/import/")
      )
        window.history.replaceState(
          null,
          "",
          `/${uiLocale}/admin/articles/${saved.id}/edit`,
        );
      notify({ title: t("editor.savedLocal"), tone: "success" });
    } catch (e) {
      setError(
        t(
          e instanceof Error && e.message === "DRAFT_CONFLICT"
            ? "editor.conflict"
            : "storageError",
        ),
      );
    } finally {
      setSaving(false);
    }
  }
  async function publish() {
    const saved = draftRef.current;
    if (
      !saved?.revision ||
      dirtyRef.current ||
      saving ||
      uploading ||
      publishing
    )
      return;
    setPublishing(true);
    setPublishError("");
    try {
      await apiSend("/api/v1/articles", "POST", {
        id: saved.id,
        locale,
        revision: saved.revision,
      });
      setChecking(false);
      notify({ title: t("editor.published"), tone: "success" });
    } catch (error) {
      setPublishError(
        t(
          error instanceof ApiClientError && error.status === 409
            ? "editor.publishConflict"
            : "editor.publishFailed",
        ),
      );
    } finally {
      setPublishing(false);
    }
  }
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  });
  if (!draft)
    return error ? (
      <p className={styles.error} role="alert">
        {error}
      </p>
    ) : (
      <LoadingSkeleton />
    );
  const translation = translationOf(draft, locale);
  const issues = checking ? publicationIssues(draft, locale) : [];
  return (
    <div className={styles.workspace} ref={workspace}>
      <header className={styles.header} ref={header}>
        <div className={styles.identity}>
          <Link
            href="/admin/articles"
            aria-label={t("editor.backToArticles")}
            title={t("editor.backToArticles")}
          >
            <ArrowLeft size={17} />
          </Link>
          <h1>{t(preview ? "editor.previewTitle" : "editor.document")}</h1>
          <span
            className={styles.saveState}
            role="status"
            title={t("editor.revision", { revision: draft.revision })}
          >
            {dirty ? <Circle size={8} /> : <Check size={12} />}
            {t(
              dirty || draft.revision === 0
                ? "editor.unsaved"
                : "editor.localState",
            )}
          </span>
        </div>
        <div className={styles.actions}>
          <div className={styles.language} title={t("editor.localeHelp")}>
            <Select
              value={locale}
              label={t("editor.contentLocale")}
              options={locales.map((value) => ({
                value,
                label: localeRegistry[value].name,
              }))}
              disabled={uploading || saving}
              onValueChange={(next) => {
                if (!isLocale(next) || next === locale) return;
                const value = snapshot();
                if (value) commit(value);
                setLocale(next);
              }}
            />
          </div>
          <Button
            size="sm"
            aria-pressed={preview}
            disabled={uploading || publishing}
            onClick={() => {
              const value = snapshot();
              if (value) commit(value);
              setPreview(!preview);
            }}
          >
            <Eye size={15} />
            {t(preview ? "editor.back" : "editor.preview")}
          </Button>
          {!preview && (
            <>
              <Button
                size="sm"
                aria-pressed={panel === "metadata"}
                ref={(element) => {
                  if (element) panelTriggers.current.metadata = element;
                }}
                aria-controls="article-side-panel"
                onClick={() =>
                  setPanel(panel === "metadata" ? null : "metadata")
                }
              >
                <SlidersHorizontal size={15} />
                {t("editor.metadata")}
              </Button>
              <Button
                size="sm"
                aria-pressed={panel === "ai"}
                ref={(element) => {
                  if (element) panelTriggers.current.ai = element;
                }}
                aria-controls="article-side-panel"
                onClick={() => setPanel(panel === "ai" ? null : "ai")}
              >
                <Sparkles size={15} />
                {t("editor.assistant")}
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="primary"
            busy={saving}
            disabled={uploading || publishing}
            title="Ctrl / Cmd S"
            onClick={save}
          >
            {t("editor.save")}
          </Button>
        </div>
      </header>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.layout} data-panel={!!panel && !preview}>
        <section className={styles.sheet} aria-label={t("editor.document")}>
          {preview ? (
            <div className={styles.documentHeading}>
              <h2>{translation.title || t("articles.untitled")}</h2>
              <p>{translation.excerpt}</p>
            </div>
          ) : (
            <div className={styles.documentHeading}>
              <Textarea
                id="article-title"
                aria-label={t("editor.fields.title")}
                placeholder={t("editor.titlePlaceholder")}
                className={styles.titleField}
                appearance="bare"
                rows={1}
                value={translation.title}
                maxLength={200}
                onChange={(e) => updateTranslation({ title: e.target.value })}
              />
              <small>
                {localeRegistry[locale].name}
                <span>·</span>
                {t("editor.writingHint")}
              </small>
            </div>
          )}
          {locales.map((code) => (
            <div key={code} hidden={code !== locale || preview}>
              <RichTextEditor
                initial={translationOf(draft, code).body}
                onReady={editorReady[code]}
                onDirty={markDirty}
                onUploading={setUploading}
                active={code === locale && !preview}
                uploader={imageUploader}
              />
            </div>
          ))}
          {preview && (
            <RichText key={`preview-${locale}`} document={translation.body} />
          )}
        </section>
        <aside
          className={styles.aside}
          id="article-side-panel"
          hidden={!panel || preview}
          aria-label={t(
            panel === "ai" ? "editor.assistant" : "editor.metadata",
          )}
        >
          <div className={styles.panelHeader}>
            <h2>
              {t(panel === "ai" ? "editor.assistant" : "editor.metadata")}
            </h2>
            <IconButton
              aria-label={t("editor.closePanel")}
              onClick={closePanel}
            >
              <X size={15} />
            </IconButton>
          </div>
          <div hidden={panel !== "ai"}>
            {readyEditors[locale] && (
              <ArticleAssistant
                key={locale}
                editor={readyEditors[locale]}
                active={panel === "ai" && !preview}
                locale={locale}
                enabled={aiEnabled}
                version={() => changes.current}
                snapshot={() => translationOf(snapshot() ?? draft, locale)}
                apply={(suggestion) => {
                  if (saving || uploading || publishing || !draftRef.current)
                    return false;
                  if (suggestion.task === "metadata") {
                    const { title, excerpt, seoTitle, seoDescription, tags } =
                      suggestion.value;
                    updateTranslation({
                      title,
                      excerpt,
                      seoTitle,
                      seoDescription,
                      tags,
                    });
                    return true;
                  }
                  const target = editors.current[suggestion.locale];
                  if (
                    !target ||
                    !target.commands.setContent(suggestion.value.body, {
                      emitUpdate: true,
                    })
                  )
                    return false;
                  const current = draftRef.current;
                  const previous = translationOf(current, suggestion.locale);
                  commit({
                    ...current,
                    translations: {
                      ...current.translations,
                      [suggestion.locale]: {
                        ...suggestion.value,
                        slug: previous.slug || suggestion.value.slug,
                      },
                    },
                  });
                  markDirty();
                  setLocale(suggestion.locale);
                  return true;
                }}
              />
            )}
          </div>
          <div className={styles.fields} hidden={panel !== "metadata"}>
            <p className={styles.localeNote}>{t("editor.localeHelp")}</p>
            <Field id="article-excerpt" label={t("editor.fields.excerpt")}>
              <Textarea
                rows={3}
                value={translation.excerpt}
                maxLength={1200}
                onChange={(e) => updateTranslation({ excerpt: e.target.value })}
              />
            </Field>
            <Field
              id="article-slug"
              label={t("editor.fields.slug")}
              description={t("editor.slugHelp")}
            >
              <Input
                value={translation.slug}
                onChange={(e) => updateTranslation({ slug: e.target.value })}
              />
            </Field>
            <Field id="article-category" label={t("editor.fields.category")}>
              <Select
                label={t("editor.fields.category")}
                value={draft.category}
                options={(["technology", "product", "life"] as const).map(
                  (value) => ({ value, label: t(`categories.${value}`) }),
                )}
                onValueChange={(category) => updateShared({ category })}
              />
            </Field>
            <Field id="article-tags" label={t("editor.fields.tags")}>
              <Input
                value={translation.tags.join(",")}
                onChange={(e) =>
                  updateTranslation({ tags: e.target.value.split(",") })
                }
              />
            </Field>
            <Field id="article-author" label={t("editor.fields.author")}>
              <Input
                value={draft.author}
                onChange={(e) => updateShared({ author: e.target.value })}
              />
            </Field>
            <Field
              id="article-publish"
              label={t("editor.fields.publishedAt")}
              description={t("editor.dateHelp")}
            >
              <DatePicker
                label={t("editor.fields.publishedAt")}
                withTime
                value={draft.publishedAt}
                onValueChange={(publishedAt) => updateShared({ publishedAt })}
              />
            </Field>
            <Field id="article-minutes" label={t("editor.fields.minutes")}>
              <Input
                type="number"
                min={1}
                max={1000}
                value={draft.minutes}
                onChange={(e) =>
                  updateShared({ minutes: Number(e.target.value) })
                }
              />
            </Field>
            <Field id="article-sketch" label={t("editor.fields.sketch")}>
              <Select
                label={t("editor.fields.sketch")}
                value={draft.sketch}
                options={(["sun", "mountain", "boat", "tree"] as const).map(
                  (value) => ({ value, label: t(`sketches.${value}`) }),
                )}
                onValueChange={(sketch) => updateShared({ sketch })}
              />
            </Field>
            <Disclosure summary={t("editor.seo")}>
              <div className={styles.fields}>
                <Field
                  id="article-seo-title"
                  label={t("editor.fields.seoTitle")}
                >
                  <Input
                    value={translation.seoTitle}
                    onChange={(e) =>
                      updateTranslation({ seoTitle: e.target.value })
                    }
                  />
                </Field>
                <Field
                  id="article-seo-description"
                  label={t("editor.fields.seoDescription")}
                >
                  <Textarea
                    value={translation.seoDescription}
                    onChange={(e) =>
                      updateTranslation({ seoDescription: e.target.value })
                    }
                  />
                </Field>
              </div>
            </Disclosure>
            <div className={styles.cover}>
              {draft.coverAssetId && (
                <AssetImage
                  id={draft.coverAssetId}
                  alt={translation.coverAlt}
                />
              )}
              <Button variant="quiet" onClick={() => setCover(true)}>
                {t("editor.cover")}
              </Button>
              {draft.coverAssetId && (
                <Button onClick={() => updateShared({ coverAssetId: "" })}>
                  {t("editor.removeCover")}
                </Button>
              )}
            </div>
            <Field id="article-cover-alt" label={t("editor.fields.coverAlt")}>
              <Input
                value={translation.coverAlt}
                onChange={(e) =>
                  updateTranslation({ coverAlt: e.target.value })
                }
              />
            </Field>
            <Button
              variant="quiet"
              disabled={uploading}
              onClick={() => {
                const value = snapshot();
                if (value) commit(value);
                setPublishError("");
                setChecking(true);
              }}
            >
              {t("editor.checkPublish")}
            </Button>
            <p className={styles.localeNote}>{t("localDetail")}</p>
          </div>
        </aside>
      </div>
      {cover && (
        <Dialog title={t("editor.cover")} onClose={() => setCover(false)} wide>
          <MediaPicker
            onSelect={(asset, alt) => {
              commit({
                ...draftRef.current!,
                coverAssetId: asset.id,
                translations: {
                  ...draftRef.current!.translations,
                  [locale]: {
                    ...translationOf(draftRef.current!, locale),
                    coverAlt: alt,
                  },
                },
              });
              markDirty();
              setCover(false);
            }}
          />
        </Dialog>
      )}
      {checking && (
        <Dialog
          title={t("editor.checkPublish")}
          onClose={() => {
            if (!publishing) setChecking(false);
          }}
        >
          {issues.length ? (
            <ul>
              {issues.map((key) => (
                <li key={key}>
                  {t("editor.missingField", {
                    field: (labels as Record<string, string>)[key] ?? key,
                  })}
                </li>
              ))}
            </ul>
          ) : (
            <p>{t("editor.checkPassed")}</p>
          )}
          {(dirty || draft.revision === 0) && (
            <p>{t("editor.saveBeforePublish")}</p>
          )}
          {publishError && <p role="alert">{publishError}</p>}
          <Button
            variant="quiet"
            disabled={publishing}
            onClick={() => setChecking(false)}
          >
            {t("editor.back")}
          </Button>
          <Button
            variant="primary"
            disabled={
              !!issues.length ||
              dirty ||
              draft.revision === 0 ||
              saving ||
              uploading
            }
            busy={publishing}
            onClick={() => void publish()}
          >
            {t("editor.publish")}
          </Button>
        </Dialog>
      )}
      {pendingLink && (
        <Dialog
          title={t("editor.leaveTitle")}
          onClose={() => setPendingLink(null)}
        >
          <p>{t("editor.leaveHelp")}</p>
          <Button variant="quiet" onClick={() => setPendingLink(null)}>
            {t("editor.keepEditing")}
          </Button>
          <Button
            onClick={() => {
              dirtyRef.current = false;
              window.location.assign(pendingLink);
            }}
          >
            {t("editor.leave")}
          </Button>
        </Dialog>
      )}
    </div>
  );
}
