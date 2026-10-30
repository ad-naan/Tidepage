"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import {
  ArrowUpRight,
  Check,
  Copy,
  Github,
  Heart,
  Highlighter,
  MessageCircle,
  Quote,
  Send,
  Smile,
  X,
} from "lucide-react";
import { usePreviewIdentity } from "@/modules/identity/ui/PreviewIdentity";
import { SpringButton } from "@/shared/ui/primitives";
type Comment = {
  id: number;
  name: string;
  color: string;
  text: string;
  time: string;
  likes: number;
  author?: boolean;
  reply?: string;
  quote?: string;
};
export function Discussion({ compact = false }: { compact?: boolean }) {
  const { loggedIn, openLogin } = usePreviewIdentity();
  const t = useTranslations("discussion");
  const identity = useTranslations("identity");
  const [comments, setComments] = useState<Comment[]>(() => [
    {
      id: 1,
      name: t("samples.mountain.name"),
      color: "sage",
      text: t("samples.mountain.text"),
      time: t("samples.mountain.time"),
      likes: 12,
    },
    {
      id: 2,
      name: "adnaan",
      color: "peach",
      text: t("samples.reply.text"),
      time: t("samples.reply.time"),
      likes: 5,
      author: true,
      reply: t("samples.mountain.name"),
    },
    {
      id: 3,
      name: t("samples.mumu.name"),
      color: "sand",
      text: t("samples.mumu.text"),
      time: t("samples.mumu.time"),
      likes: 8,
    },
  ]);
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [quote, setQuote] = useState("");
  const [liked, setLiked] = useState<number[]>([]);
  const [reaction, setReaction] = useState("");
  const [sort, setSort] = useState<"hot" | "new">("hot");
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    function quoteHandler(e: Event) {
      setQuote((e as CustomEvent<string>).detail);
      document
        .getElementById("discussion")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      field.current?.focus({ preventScroll: true });
    }
    window.addEventListener("article-quote", quoteHandler);
    return () => window.removeEventListener("article-quote", quoteHandler);
  }, []);
  const sorted = [...comments].sort((a, b) =>
    sort === "new" ? b.id - a.id : a.id - b.id,
  );
  const reactions = [
    { emoji: "🌱", key: "inspired", count: 24 },
    { emoji: "☕", key: "resonate", count: 18 },
    { emoji: "✦", key: "love", count: 32 },
  ] as const;
  return (
    <section
      id="discussion"
      className={`discussion ${compact ? "compact" : ""}`}
    >
      {!compact && (
        <div className="article-reactions">
          <div>
            <h3>{t("reactionsTitle")}</h3>
            <p>{t("reactionsSub")}</p>
          </div>
          <div className="reaction-options">
            {reactions.map(({ emoji, key, count }) => (
              <motion.button
                key={key}
                className={reaction === key ? "chosen" : ""}
                onClick={() => setReaction(reaction === key ? "" : key)}
                whileTap={{ scale: 0.9 }}
              >
                <span>{emoji}</span>
                {t(key)}
                <small>{count + (reaction === key ? 1 : 0)}</small>
              </motion.button>
            ))}
          </div>
        </div>
      )}
      <div className="discussion-heading">
        <h2>
          {t("echo")} <span>{comments.length}</span>
        </h2>
        <span>{t("echoSub")}</span>
      </div>
      <div className="comment-editor">
        <div className="editor-top">
          <span className="comment-avatar">
            {loggedIn ? identity("guestBadge") : <Github size={18} />}
          </span>
          <div>
            <strong>
              {loggedIn ? identity("guestName") : t("editorTitle")}
            </strong>
            <p>
              {loggedIn ? t("editorHintLoggedIn") : t("editorHint")}
            </p>
          </div>
          {!loggedIn && (
            <button onClick={openLogin}>
              {t("githubLogin")} <ArrowUpRight size={13} />
            </button>
          )}
        </div>
        {(quote || reply) && (
          <div className="reply-context">
            <Quote size={13} />
            <span>{quote || `@${reply}`}</span>
            <button
              aria-label={t("cancelContext")}
              onClick={() => {
                setQuote("");
                setReply("");
              }}
            >
              <X size={13} />
            </button>
          </div>
        )}
        <textarea
          ref={field}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={reply ? t("replyTo", { name: reply }) : t("placeholder")}
          rows={3}
          maxLength={1000}
          aria-label={t("contentLabel")}
        />
        <div className="editor-footer">
          <button
            className="emoji-button"
            aria-label={t("emoji")}
            onClick={() => {
              setText((v) => `${v} 🌿`);
              field.current?.focus();
            }}
          >
            <Smile size={17} />
          </button>
          <span>
            {text.length}/1000 <i>·</i> {t("counter")}
          </span>
          <SpringButton
            className="comment-submit"
            disabled={!text.trim()}
            onClick={() => {
              if (!loggedIn) {
                openLogin();
                return;
              }
              setComments((v) => [
                ...v,
                {
                  id: Date.now(),
                  name: identity("guestName"),
                  color: "sage",
                  text: text.trim(),
                  time: t("justNow"),
                  likes: 0,
                  reply: reply || undefined,
                  quote: quote || undefined,
                },
              ]);
              setText("");
              setReply("");
              setQuote("");
              setSort("new");
            }}
          >
            <Send size={13} />
            {t("submit")}
          </SpringButton>
        </div>
      </div>
      <div className="comments-toolbar">
        <span>{t("all")}</span>
        <div>
          {(["hot", "new"] as const).map((s) => (
            <button
              className={sort === s ? "active" : ""}
              key={s}
              onClick={() => setSort(s)}
            >
              {t(s)}
            </button>
          ))}
        </div>
      </div>
      <div className="comment-list">
        {sorted.map((c) => (
          <motion.article
            key={c.id}
            className={`comment-item ${c.reply ? "is-reply" : ""}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className={`comment-avatar ${c.color}`}>{c.name[0]}</span>
            <div className="comment-body">
              <div className="comment-meta">
                <strong>{c.name}</strong>
                {c.author && <span className="author-badge">{t("author")}</span>}
                <time>{c.time}</time>
              </div>
              {c.quote && <blockquote>{c.quote}</blockquote>}
              <p>
                {c.reply && <span className="reply-name">@{c.reply} </span>}
                {c.text}
              </p>
              <div className="comment-actions">
                <button
                  className={liked.includes(c.id) ? "liked" : ""}
                  aria-label={t("like", { name: c.name })}
                  onClick={() =>
                    setLiked((v) =>
                      v.includes(c.id)
                        ? v.filter((id) => id !== c.id)
                        : [...v, c.id],
                    )
                  }
                >
                  <Heart
                    size={13}
                    fill={liked.includes(c.id) ? "currentColor" : "none"}
                  />
                  {c.likes + (liked.includes(c.id) ? 1 : 0)}
                </button>
                <button
                  onClick={() => {
                    setReply(c.name);
                    field.current?.focus();
                    field.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }}
                >
                  <MessageCircle size={13} />
                  {t("reply")}
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
      <p className="discussion-demo">{t("demo")}</p>
    </section>
  );
}
export function ReadingAnnotations() {
  const t = useTranslations("discussion");
  const [selection, setSelection] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [marked, setMarked] = useState("");
  useEffect(() => {
    function capture() {
      const s = window.getSelection();
      const text = s?.toString().trim();
      const element = s?.anchorNode?.parentElement;
      if (!text || !element?.closest(".prose") || text.length > 500) {
        setSelection("");
        return;
      }
      const rect = s!.getRangeAt(0).getBoundingClientRect();
      setSelection(text);
      setPosition({
        top: Math.max(10, rect.top - 46),
        left: Math.max(
          12,
          Math.min(window.innerWidth - 200, rect.left + rect.width / 2 - 90),
        ),
      });
    }
    document.addEventListener("mouseup", capture);
    document.addEventListener("keyup", capture);
    const clear = () => setSelection("");
    window.addEventListener("scroll", clear);
    return () => {
      document.removeEventListener("mouseup", capture);
      document.removeEventListener("keyup", capture);
      window.removeEventListener("scroll", clear);
    };
  }, []);
  return (
    <>
      <AnimatePresence>
        {selection && (
          <motion.div
            className="selection-toolbar"
            style={position}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <button
              onClick={() => {
                setMarked(selection);
                setSelection("");
              }}
            >
              <Highlighter size={13} />
              {t("mark")}
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("article-quote", { detail: selection }),
                );
                setSelection("");
              }}
            >
              <Quote size={13} />
              {t("quote")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {marked && (
        <div className="annotation-note">
          <span>
            <Highlighter size={14} />
            {t("marked")}
          </span>
          <p>{marked}</p>
          <small>{t("markPreview")}</small>
          <button aria-label={t("closeMark")} onClick={() => setMarked("")}>
            <X size={13} />
          </button>
        </div>
      )}
    </>
  );
}
export function RichArticleDetails() {
  const t = useTranslations("articleDemo");
  const [copied, setCopied] = useState(false);
  const snippet =
    'const life = {\n  curiosity: Infinity,\n  pace: "your own",\n  roomForWonder: true\n};';
  return (
    <div className="rich-article-details">
      <aside className="article-callout">
        <span>✳</span>
        <div>
          <strong>{t("calloutTitle")}</strong>
          <p>
            {t("calloutIntro")}
            <mark>{t("calloutMark")}</mark>
            {t("calloutOutro")}
            <a href="#footnote-1" className="footnote-link">
              [1]
            </a>
          </p>
        </div>
      </aside>
      <blockquote className="editorial-quote">
        <Quote size={23} />
        <p>
          {t("quote1")}
          <br />
          {t("quote2")}
        </p>
        <cite>{t("cite")}</cite>
      </blockquote>
      <div className="article-code">
        <div>
          <span>{t("codeTitle")}</span>
          <button
            aria-label={t("copy")}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(snippet);
                setCopied(true);
              } catch {}
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <pre data-custom-scroll={t("codeRegion")}>
          <code>
            <span className="code-purple">const</span> life = {"{"}
            {"\n"} curiosity: <span className="code-orange">Infinity</span>,
            {"\n"} pace: <span className="code-green">"your own"</span>,{"\n"}{" "}
            roomForWonder: <span className="code-orange">true</span>
            {"\n"}
            {"};"}
          </code>
        </pre>
      </div>
      <div className="article-footnotes" id="footnote-1">
        <span>{t("footnotes")}</span>
        <p>
          <sup>1</sup> {t("footnote")}
        </p>
      </div>
    </div>
  );
}
