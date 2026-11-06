"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { MessageCircle, X } from "lucide-react";
import type {
  Comment,
  CommentPage,
  DiscussionTarget,
} from "@/modules/engagement/domain/discussion";
import { useIdentity } from "@/modules/identity/ui/IdentityProvider";
import { apiGet, apiSend, ApiClientError } from "@/shared/http/client";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { RichText } from "@/modules/content/ui/rich-text/RichText";
import {
  documentText,
  emptyDocument,
  type EditorNode,
} from "@/modules/content/domain/editor-document";
import { commentLayout } from "@/modules/engagement/domain/comment-layout";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
import { CommentItem } from "./CommentItem";
import styles from "./CommentThread.module.css";
const RichTextComposer = dynamic(
  () =>
    import("@/modules/content/ui/rich-text/RichTextComposer").then(
      (module) => module.RichTextComposer,
    ),
  { ssr: false, loading: () => <LoadingSkeleton variant="document" /> },
);

export function CommentThread({
  target,
  compact = false,
  quote,
  focusRequest,
}: {
  target: DiscussionTarget;
  compact?: boolean;
  quote?: { text: string; revision: number };
  focusRequest?: number;
}) {
  const locale = useLocale();
  // A target change remounts all state, drafts and pending requests together.
  return (
    <Thread
      key={`${target.type}:${target.id}:${locale}`}
      target={target}
      compact={compact}
      quote={quote}
      focusRequest={focusRequest}
    />
  );
}
function Thread({
  target,
  compact,
  quote,
  focusRequest,
}: {
  target: DiscussionTarget;
  compact: boolean;
  quote?: { text: string; revision: number };
  focusRequest?: number;
}) {
  const t = useTranslations("comments");
  const locale = useLocale();
  const { principal, openLogin } = useIdentity();
  const [items, setItems] = useState<Comment[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sendError, setSendError] = useState("");
  const [draft, setDraft] = useState<EditorNode>(emptyDocument);
  const [composerKey, setComposerKey] = useState(0);
  const [preview, setPreview] = useState(false);
  const [composerActive, setComposerActive] = useState(false);
  const lastQuote = useRef<number | undefined>(undefined);
  const focusComposer = useRef(false);
  const text = documentText(draft).trim();
  const [reply, setReply] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const fieldId = useId();
  const headingId = useId();
  const input = useRef<Editor | null>(null);
  const active = useRef(true);
  const request = useRef<AbortController | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const loadingLock = useRef(false);
  const path = (cursor?: string) =>
    `/api/v1/comments?${new URLSearchParams({ type: target.type, id: target.id, locale, ...(cursor ? { after: cursor } : {}) })}` as const;
  async function load(cursor?: string) {
    if (loadingLock.current) return;
    loadingLock.current = true;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setLoadError(false);
    try {
      const page = await apiGet<CommentPage>(path(cursor), {
        signal: controller.signal,
      });
      if (!active.current || controller.signal.aborted) return;
      setItems((previous) =>
        [
          ...new Map(
            [...previous, ...page.items].map((item) => [item.id, item]),
          ).values(),
        ].sort(
          (a, b) =>
            a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
        ),
      );
      setNext(page.next);
    } catch {
      if (active.current && !controller.signal.aborted) setLoadError(true);
    } finally {
      if (request.current === controller) loadingLock.current = false;
      if (active.current && !controller.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    active.current = true;
    void load();
    return () => {
      active.current = false;
      request.current?.abort();
      loadingLock.current = false;
    };
  }, []);
  function insertQuote(editor: Editor) {
    if (!quote || lastQuote.current === quote.revision) return;
    lastQuote.current = quote.revision;
    editor
      ?.chain()
      .focus("end")
      .insertContent([
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: quote.text }],
            },
          ],
        },
        { type: "paragraph" },
      ])
      .run();
  }
  useEffect(() => {
    if (!quote) return;
    setComposerActive(true);
    setPreview(false);
    focusComposer.current = true;
    if (input.current) insertQuote(input.current);
  }, [quote]);
  useEffect(() => {
    if (!focusRequest) return;
    setComposerActive(true);
    setPreview(false);
    focusComposer.current = true;
    input.current?.commands.focus("end");
  }, [focusRequest]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!principal) {
      openLogin();
      return;
    }
    if (!text || text.length > 2000 || sending) return;
    setSending(true);
    setSendError("");
    setSent(false);
    try {
      const comment = await apiSend<Comment>("/api/v1/comments", "POST", {
        target,
        locale,
        document: draft,
        ...(reply ? { parentId: reply.id } : {}),
      });
      if (!active.current) return;
      setItems((previous) => [...previous, comment]);
      setDraft(emptyDocument());
      setComposerKey((key) => key + 1);
      setPreview(false);
      setReply(null);
      setSent(true);
    } catch (error) {
      if (!active.current) return;
      setSendError(
        t(
          error instanceof ApiClientError && error.code === "RATE_LIMITED"
            ? "rateLimited"
            : error instanceof ApiClientError && error.status === 401
              ? "sessionExpired"
              : "sendFailed",
        ),
      );
    } finally {
      if (active.current) setSending(false);
    }
  }
  return (
    <section
      className={`${styles.thread} ${compact ? styles.compact : ""}`}
      aria-labelledby={headingId}
    >
      <header className={styles.heading}>
        <MessageCircle size={17} aria-hidden />
        <h2 id={headingId}>{t("title")}</h2>
        {!loading && !loadError && (
          <span className={styles.count}>
            {t(next ? "loadedCount" : "count", { count: items.length })}
          </span>
        )}
      </header>
      <p className={styles.intro}>{t("intro")}</p>
      <div className={styles.list} aria-busy={loading}>
        {commentLayout(items).map(({ item, reply: isReply }) => (
          <CommentItem
            key={item.id}
            item={item}
            nested={isReply}
            onReply={(item) => {
              setReply(item);
              setSent(false);
              setComposerActive(true);
              setPreview(false);
              focusComposer.current = true;
              form.current?.scrollIntoView({
                block: "nearest",
                behavior: "instant",
              });
              input.current?.commands.focus();
            }}
          />
        ))}
        {loading && <LoadingSkeleton variant="rows" />}
        {!loading && loadError && (
          <div className={styles.status} role="status">
            <p>{t("loadFailed")}</p>
            <Button
              variant="quiet"
              onClick={() => void load(next ?? undefined)}
            >
              {t("retry")}
            </Button>
          </div>
        )}
        {!loading && !loadError && !items.length && (
          <p className={styles.empty}>{t("empty")}</p>
        )}
        {!loading && !loadError && next && (
          <Button
            className={styles.more}
            variant="quiet"
            onClick={() => void load(next)}
          >
            {t("more")}
          </Button>
        )}
      </div>
      <form ref={form} onSubmit={submit} className={styles.form}>
        {reply && (
          <div className={styles.replyContext}>
            <span>{t("replyingTo", { name: reply.author })}</span>
            <IconButton
              aria-label={t("cancelReply")}
              onClick={() => setReply(null)}
            >
              <X size={14} />
            </IconButton>
          </div>
        )}
        <label htmlFor={fieldId}>
          {principal
            ? t("writingAs", { name: principal.displayName })
            : t("write")}
        </label>
        {composerActive && (
          <Button
            className={styles.previewToggle}
            aria-pressed={preview}
            onClick={() => setPreview((value) => !value)}
          >
            {preview ? t("edit") : t("preview")}
          </Button>
        )}
        {!composerActive && (
          <Button
            className={styles.startWriting}
            variant="quiet"
            onClick={() => {
              setComposerActive(true);
              focusComposer.current = true;
            }}
          >
            {t("placeholder")}
          </Button>
        )}
        {composerActive && (
          <div hidden={preview}>
            <RichTextComposer
              key={composerKey}
              id={fieldId}
              label={t("write")}
              placeholder={t("placeholder")}
              initial={draft}
              disabled={sending}
              onReady={(editor) => {
                input.current = editor;
                if (!editor) return;
                insertQuote(editor);
                if (focusComposer.current) {
                  editor.commands.focus("end");
                  focusComposer.current = false;
                }
              }}
              onChange={(value) => {
                setDraft(value);
                setSent(false);
              }}
            />
          </div>
        )}
        {preview && (
          <div className={styles.previewBody}>
            {text ? (
              <RichText document={draft} compact />
            ) : (
              <p>{t("placeholder")}</p>
            )}
          </div>
        )}
        <div className={styles.formFooter}>
          <span className={styles.hint}>
            {principal ? t("limit", { count: text.length }) : t("loginHint")}
          </span>
          {principal ? (
            <Button
              type="submit"
              variant="primary"
              size="sm"
              busy={sending}
              disabled={!text || text.length > 2000}
            >
              {t("submit")}
            </Button>
          ) : (
            <Button variant="quiet" size="sm" onClick={openLogin}>
              {t("login")}
            </Button>
          )}
        </div>
        {sendError && (
          <p className={styles.error} role="alert">
            {sendError}
          </p>
        )}
        {sent && (
          <p className={styles.status} role="status">
            {t("sent")}
          </p>
        )}
      </form>
    </section>
  );
}
