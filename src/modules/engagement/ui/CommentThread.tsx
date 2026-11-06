"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { MessageCircle, Reply, X } from "lucide-react";
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
import { plainTextDocument } from "@/shared/contracts/rich-text";
import { AuthorNameText } from "@/modules/identity/ui/AuthorSignature";
import styles from "./CommentThread.module.css";
const RichTextComposer = dynamic(
  () =>
    import("@/modules/content/ui/rich-text/RichTextComposer").then(
      (module) => module.RichTextComposer,
    ),
  { ssr: false },
);

export function CommentThread({
  target,
  compact = false,
}: {
  target: DiscussionTarget;
  compact?: boolean;
}) {
  const locale = useLocale();
  // A target change remounts all state, drafts and pending requests together.
  return (
    <Thread
      key={`${target.type}:${target.id}:${locale}`}
      target={target}
      compact={compact}
    />
  );
}
function Thread({
  target,
  compact,
}: {
  target: DiscussionTarget;
  compact: boolean;
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
  const text = documentText(draft).trim();
  const [reply, setReply] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const fieldId = useId();
  const headingId = useId();
  const input = useRef<Editor | null>(null);
  const active = useRef(true);
  const request = useRef<AbortController | null>(null);
  const path = (cursor?: string) =>
    `/api/v1/comments?${new URLSearchParams({ type: target.type, id: target.id, locale, ...(cursor ? { after: cursor } : {}) })}` as const;
  async function load(cursor?: string) {
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
      if (active.current && !controller.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    active.current = true;
    void load();
    return () => {
      active.current = false;
      request.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (target.type !== "article") return;
    function quote(event: Event) {
      const text = (event as CustomEvent<string>).detail;
      if (typeof text !== "string") return;
      input.current
        ?.chain()
        .focus("end")
        .insertContent([
          {
            type: "blockquote",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: text.slice(0, 500) }],
              },
            ],
          },
          { type: "paragraph" },
        ])
        .run();
    }
    window.addEventListener("article-quote", quote);
    return () => window.removeEventListener("article-quote", quote);
  }, [target.type]);
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
      </header>
      <p className={styles.intro}>{t("intro")}</p>
      <div className={styles.list} aria-busy={loading}>
        {items.map((item) => (
          <article key={item.id} className={styles.comment}>
            <span className={styles.avatar} aria-hidden>
              {item.author.slice(0, 1).toUpperCase()}
            </span>
            <div className={styles.commentContent}>
              <div className={styles.meta}>
                <strong>
                  <AuthorNameText text={item.author} />
                </strong>
                <time dateTime={item.createdAt}>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(item.createdAt))}
                </time>
              </div>
              {item.replyTo && (
                <span className={styles.replyTo}>
                  {t("replyingTo", { name: item.replyTo })}
                </span>
              )}
              <div className={styles.commentBody}>
                <RichText
                  document={item.document ?? plainTextDocument(item.body)}
                  compact
                />
              </div>
              <Button
                className={styles.replyButton}
                onClick={() => {
                  setReply(item);
                  setSent(false);
                  input.current?.commands.focus();
                }}
              >
                <Reply size={13} />
                {t("reply")}
              </Button>
            </div>
          </article>
        ))}
        {loading && (
          <p className={styles.status} role="status">
            {t("loading")}
          </p>
        )}
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
      <form onSubmit={submit} className={styles.form}>
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
        <Button
          className={styles.previewToggle}
          aria-pressed={preview}
          onClick={() => setPreview((value) => !value)}
        >
          {preview ? t("edit") : t("preview")}
        </Button>
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
            }}
            onChange={(value) => {
              setDraft(value);
              setSent(false);
            }}
          />
        </div>
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
