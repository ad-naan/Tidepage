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
  Languages,
  X,
  Focus,
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
  articleTranslationSchema,
  documentText,
  publicationIssues,
  type ArticleDraft,
  type ArticleTranslation,
  type EditorNode,
} from "@/modules/content/domain/editor-document";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { ActionBar } from "@/shared/ui/action-bar/ActionBar";
import { Input } from "@/shared/ui/field/Input";
import { DatePicker } from "@/shared/ui/date-picker/DatePicker";
import { Textarea } from "@/shared/ui/field/Textarea";
import { Field } from "@/shared/ui/field/Field";
import { Select } from "@/shared/ui/select/Select";
import { Disclosure } from "@/shared/ui/disclosure/Disclosure";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { ConfirmDialog } from "@/shared/ui/dialog/ConfirmDialog";
import { useNotice, NoticeDock } from "@/shared/ui/feedback/NoticeProvider";
import { AssetImage } from "@/modules/media/ui/admin/AssetImage";
import { MediaPicker } from "@/modules/media/ui/admin/MediaPicker";
import { RichTextEditor } from "./editor/RichTextEditor";
import { RichText } from "@/modules/content/ui/rich-text/RichText";
import { loadArticleDrafts, saveArticleDraft } from "./draft-store";
import { imageUploader } from "@/modules/media/ui/admin/media-client";
import { apiSend, ApiClientError } from "@/shared/http/client";
import {
  articleContextLimit,
  editorialTimeoutMs,
  translationSegmentLimit,
  translationTextLimit,
  type MetadataSuggestion,
} from "@/modules/ai/domain/writing";
import { createHttpWritingAgent } from "@/modules/ai/ui/writing-agent";
import {
  applyTranslationSegments,
  translationSegments,
} from "@/modules/content/domain/translation";
import { PublicationReviewPanel } from "./PublicationReviewPanel";
import styles from "./ArticleEditorView.module.css";

const editorialEndpoint = "/api/v1/ai/writing";
const writingAgent = createHttpWritingAgent(editorialEndpoint);

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
  const [panel, setPanel] = useState(false);
  const [focused, setFocused] = useState(false);
  const focusTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!focused) return;
    const escape = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        document.fullscreenElement ||
        document.querySelector("dialog[open]") ||
        panel
      )
        return;
      event.preventDefault();
      setFocused(false);
      focusTrigger.current?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [focused, panel]);
  const panelTrigger = useRef<HTMLButtonElement>(null);
  function closePanel() {
    panelTrigger.current?.focus({ preventScroll: true });
    setPanel(false);
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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [cover, setCover] = useState(false);
  const [checking, setChecking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState<"metadata" | "translate" | null>(
    null,
  );
  const [confirmTranslation, setConfirmTranslation] = useState(false);
  const [geoReview, setGeoReview] = useState<Partial<Record<Locale, string[]>>>(
    {},
  );
  const generation = useRef<AbortController | null>(null);
  const targetLocale = locale === "en" ? "zh-CN" : "en";
  const targetLanguage = localeRegistry[targetLocale].name;
  useEffect(() => () => generation.current?.abort(), [id]);
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
  function requestTranslation() {
    const current = snapshot();
    if (!current) return;
    const target = translationOf(current, targetLocale);
    if (
      translationSegments(target).length ||
      target.body.content?.some(
        (node) => node.type !== "paragraph" || node.content?.length,
      )
    ) {
      setConfirmTranslation(true);
    } else {
      void generate("translate");
    }
  }
  async function generate(task: "metadata" | "translate") {
    const draft = snapshot();
    if (
      !aiEnabled ||
      !draft ||
      uploading ||
      saving ||
      publishing ||
      generation.current
    )
      return;
    const source = translationOf(draft, locale);
    const context = documentText(source.body).trim();
    const segments = task === "translate" ? translationSegments(source) : [];
    if (task === "metadata" ? !context : !segments.length) {
      notify({ title: t("ai.addContent"), tone: "error" });
      return;
    }
    if (
      segments.length > translationSegmentLimit ||
      segments.reduce((total, segment) => total + segment.length, 0) >
        translationTextLimit
    ) {
      notify({ title: t("ai.translationLimit"), tone: "error" });
      return;
    }
    const version = changes.current;
    const request = new AbortController();
    generation.current = request;
    setGenerating(task);
    const options = { signal: request.signal, timeoutMs: editorialTimeoutMs };
    function currentDraft() {
      if (request.signal.aborted || draftRef.current?.id !== draft?.id)
        return null;
      if (changes.current === version) return draftRef.current;
      notify({ title: t("ai.conflict"), tone: "error" });
      return null;
    }
    try {
      if (task === "metadata") {
        const { excerpt, seoTitle, seoDescription, tags, review } =
          await apiSend<MetadataSuggestion>(
            editorialEndpoint,
            "POST",
            {
              task,
              locale,
              title: source.title,
              context: context.slice(0, articleContextLimit),
            },
            options,
          );
        if (!currentDraft()) return;
        updateTranslation({ excerpt, seoTitle, seoDescription, tags });
        setGeoReview((previous) => ({ ...previous, [locale]: review }));
        notify({ title: t("ai.metadataReady"), tone: "success" });
      } else {
        const translated = await apiSend<string[]>(
          editorialEndpoint,
          "POST",
          { task, locale: targetLocale, sourceLocale: locale, segments },
          options,
        );
        const current = currentDraft();
        if (!current) return;
        const value = articleTranslationSchema.parse(
          applyTranslationSegments(source, translated),
        );
        const target = editors.current[targetLocale];
        if (
          !target?.commands.setContent(value.body, {
            emitUpdate: false,
            errorOnInvalidContent: true,
          })
        )
          throw new Error("TRANSLATION_EDITOR_UNAVAILABLE");
        commit({
          ...current,
          translations: {
            ...current.translations,
            [targetLocale]: {
              ...value,
              slug: translationOf(current, targetLocale).slug || value.slug,
            },
          },
        });
        markDirty();
        setLocale(targetLocale);
        notify({
          title: t("ai.translationReady", { language: targetLanguage }),
          tone: "success",
        });
      }
    } catch {
      if (!request.signal.aborted)
        notify({ title: t("ai.suggestionFailed"), tone: "error" });
    } finally {
      if (generation.current === request) {
        generation.current = null;
        setGenerating(null);
      }
    }
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
  const needsSave = dirty || draft.revision === 0;
  return (
    <div
      className={styles.workspace}
      ref={workspace}
      data-editor-focus={focused}
    >
      <header className={styles.header} ref={header}>
        {focused && <NoticeDock />}
        <div className={styles.identity}>
          <Link
            href="/admin/articles"
            aria-label={t("editor.backToArticles")}
            title={t("editor.backToArticles")}
          >
            <ArrowLeft size={17} />
          </Link>
          <h1>{t(preview ? "editor.previewTitle" : "editor.document")}</h1>
        </div>
        <div className={styles.actions}>
          <Button
            variant="quiet"
            size="sm"
            ref={focusTrigger}
            aria-pressed={focused}
            onClick={() => setFocused(!focused)}
          >
            <Focus size={15} />
            {t(focused ? "editor.exitFocus" : "editor.focus")}
          </Button>
          <div className={styles.language} title={t("editor.localeHelp")}>
            <Select
              value={locale}
              label={t("editor.contentLocale")}
              options={locales.map((value) => ({
                value,
                label: localeRegistry[value].name,
              }))}
              disabled={uploading || saving || !!generating}
              onValueChange={(next) => {
                if (!isLocale(next) || next === locale) return;
                const value = snapshot();
                if (value) commit(value);
                setLocale(next);
              }}
            />
          </div>
          <Button
            variant="quiet"
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
            <Button
              variant="quiet"
              size="sm"
              busy={generating === "translate"}
              disabled={
                !aiEnabled || !!generating || uploading || saving || publishing
              }
              title={!aiEnabled ? t("ai.unavailable") : undefined}
              onClick={requestTranslation}
            >
              <Languages size={15} />
              {t("ai.translateTo", { language: targetLanguage })}
            </Button>
          )}
          {generating === "translate" && (
            <Button
              variant="quiet"
              size="sm"
              onClick={() => generation.current?.abort()}
            >
              {t("ai.stop")}
            </Button>
          )}
          {!preview && (
            <Button
              variant="quiet"
              size="sm"
              aria-pressed={panel}
              ref={panelTrigger}
              aria-controls="article-side-panel"
              onClick={() => setPanel(!panel)}
            >
              <SlidersHorizontal size={15} />
              {t("editor.metadata")}
            </Button>
          )}
        </div>
        <div className={styles.publicationBar}>
          <ActionBar
            context={
              <span
                role="status"
                title={t("editor.revision", { revision: draft.revision })}
              >
                {t(needsSave ? "editor.unsaved" : "editor.localState")}
              </span>
            }
          >
            <Button
              size="sm"
              variant={needsSave ? "primary" : "quiet"}
              busy={saving}
              disabled={uploading || publishing}
              title="Ctrl / Cmd S"
              onClick={save}
            >
              {t("editor.save")}
            </Button>
            <Button
              size="sm"
              variant={needsSave ? "quiet" : "primary"}
              disabled={uploading || saving || publishing}
              onClick={() => {
                const value = snapshot();
                if (value) commit(value);
                setPublishError("");
                setChecking(true);
              }}
            >
              {t("editor.checkPublish")}
            </Button>
          </ActionBar>
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
                writingAgent={aiEnabled ? writingAgent : undefined}
                contentLocale={code}
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
          aria-label={t("editor.metadata")}
        >
          <div className={styles.panelHeader}>
            <h2>{t("editor.metadata")}</h2>
            <IconButton
              aria-label={t("editor.closePanel")}
              onClick={closePanel}
            >
              <X size={15} />
            </IconButton>
          </div>
          <div className={styles.fields}>
            <p className={styles.localeNote}>{t("editor.localeHelp")}</p>
            <div className={styles.generation}>
              <Button
                variant="quiet"
                size="sm"
                busy={generating === "metadata"}
                disabled={
                  !aiEnabled ||
                  !!generating ||
                  uploading ||
                  saving ||
                  publishing
                }
                onClick={() => void generate("metadata")}
              >
                <Sparkles size={15} />
                {t("ai.metadata")}
              </Button>
              {generating === "metadata" && (
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => generation.current?.abort()}
                >
                  {t("ai.stop")}
                </Button>
              )}
              <p className={styles.localeNote}>
                {t(aiEnabled ? "ai.metadataHelp" : "ai.unavailable")}
              </p>
            </div>
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
            {!!geoReview[locale]?.length && (
              <div className={styles.generation}>
                <strong>{t("ai.geoReview")}</strong>
                <ul>
                  {geoReview[locale]?.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className={styles.cover}>
              {draft.coverAssetId && (
                <AssetImage
                  id={draft.coverAssetId}
                  alt={translation.coverAlt}
                  preview
                />
              )}
              <Button variant="quiet" onClick={() => setCover(true)}>
                {t("editor.cover")}
              </Button>
              {draft.coverAssetId && (
                <Button
                  variant="quiet"
                  onClick={() => updateShared({ coverAssetId: "" })}
                >
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
            <p className={styles.localeNote}>{t("localDetail")}</p>
          </div>
        </aside>
      </div>
      {confirmTranslation && (
        <ConfirmDialog
          title={t("ai.translateTo", { language: targetLanguage })}
          description={t("ai.translationReview", { language: targetLanguage })}
          cancelLabel={t("editor.keepEditing")}
          confirmLabel={t("ai.replaceTranslation")}
          danger
          onClose={() => setConfirmTranslation(false)}
          onConfirm={() => {
            setConfirmTranslation(false);
            void generate("translate");
          }}
        />
      )}
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
        <ConfirmDialog
          title={t("editor.checkPublish")}
          description={
            issues.length ? (
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
            )
          }
          cancelLabel={t("editor.back")}
          confirmLabel={t("editor.publish")}
          busy={publishing}
          disabled={
            !!issues.length ||
            dirty ||
            draft.revision === 0 ||
            saving ||
            uploading
          }
          onClose={() => setChecking(false)}
          onConfirm={() => void publish()}
        >
          {(dirty || draft.revision === 0) && (
            <p>{t("editor.saveBeforePublish")}</p>
          )}
          <PublicationReviewPanel
            key={`${draft.id}:${locale}:${draft.revision}`}
            draft={{ id: draft.id, locale, revision: draft.revision }}
            enabled={aiEnabled}
            disabled={
              dirty || draft.revision === 0 || saving || uploading || publishing
            }
          />
          {publishError && <p role="alert">{publishError}</p>}
        </ConfirmDialog>
      )}
      {pendingLink && (
        <ConfirmDialog
          title={t("editor.leaveTitle")}
          description={t("editor.leaveHelp")}
          cancelLabel={t("editor.keepEditing")}
          confirmLabel={t("editor.leave")}
          danger
          onClose={() => setPendingLink(null)}
          onConfirm={() => {
            dirtyRef.current = false;
            window.location.assign(pendingLink);
          }}
        />
      )}
    </div>
  );
}
