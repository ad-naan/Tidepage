"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
const sampleComments: Comment[] = [
  {
    id: 1,
    name: "山间来信",
    color: "sage",
    text: "“空白不是浪费，它是让想法长出根的地方。” 读到这里停了一会儿。最近也一直在反思，到底是在生活，还是在完成清单。",
    time: "2 小时前",
    likes: 12,
  },
  {
    id: 2,
    name: "adnaan",
    color: "peach",
    text: "能一起慢下来就很好。也在学习给自己留一点无用、但很快乐的时间。",
    time: "1 小时前",
    likes: 5,
    author: true,
    reply: "山间来信",
  },
  {
    id: 3,
    name: "木木",
    color: "sand",
    text: "读完想合上电脑去散步了，谢谢这篇温柔的提醒 🌿",
    time: "35 分钟前",
    likes: 8,
  },
];
export function Discussion({ compact = false }: { compact?: boolean }) {
  const { loggedIn, openLogin } = usePreviewIdentity();
  const [comments, setComments] = useState(sampleComments);
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [quote, setQuote] = useState("");
  const [liked, setLiked] = useState<number[]>([]);
  const [reaction, setReaction] = useState("");
  const [sort, setSort] = useState("热度");
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
    sort === "最新" ? b.id - a.id : a.id - b.id,
  );
  return (
    <section
      id="discussion"
      className={`discussion ${compact ? "compact" : ""}`}
    >
      {!compact && (
        <div className="article-reactions">
          <div>
            <h3>这篇文章，让你想到了什么？</h3>
            <p>留下一个小小的回应。</p>
          </div>
          <div className="reaction-options">
            {[
              ["🌱", "有启发", "24"],
              ["☕", "有共鸣", "18"],
              ["✦", "喜欢", "32"],
            ].map(([emoji, label, count]) => (
              <motion.button
                key={label}
                className={reaction === label ? "chosen" : ""}
                onClick={() => setReaction(reaction === label ? "" : label)}
                whileTap={{ scale: 0.9 }}
              >
                <span>{emoji}</span>
                {label}
                <small>{Number(count) + (reaction === label ? 1 : 0)}</small>
              </motion.button>
            ))}
          </div>
        </div>
      )}
      <div className="discussion-heading">
        <h2>
          留下回声 <span>{comments.length}</span>
        </h2>
        <span>从我写下，到我们相遇。</span>
      </div>
      <div className="comment-editor">
        <div className="editor-top">
          <span className="comment-avatar">
            {loggedIn ? "访" : <Github size={18} />}
          </span>
          <div>
            <strong>{loggedIn ? "演示访客" : "以你的名字，留下想法"}</strong>
            <p>
              {loggedIn
                ? "已登录状态预览"
                : "登录后参与讨论，也让好想法被看见。"}
            </p>
          </div>
          {!loggedIn && (
            <button onClick={openLogin}>
              GitHub 登录 <ArrowUpRight size={13} />
            </button>
          )}
        </div>
        {(quote || reply) && (
          <div className="reply-context">
            <Quote size={13} />
            <span>{quote || `回复 @${reply}`}</span>
            <button
              aria-label="取消引用或回复"
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
          placeholder={
            reply
              ? `回复 ${reply}，交换一点想法…`
              : "读到这里，有没有什么想说的？"
          }
          rows={3}
          maxLength={1000}
          aria-label="评论内容"
        />
        <div className="editor-footer">
          <button
            className="emoji-button"
            aria-label="添加表情"
            onClick={() => {
              setText((v) => `${v} 🌿`);
              field.current?.focus();
            }}
          >
            <Smile size={17} />
          </button>
          <span>
            {text.length}/1000 <i>·</i> 支持引用段落
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
                  name: "演示访客",
                  color: "sage",
                  text: text.trim(),
                  time: "刚刚 · 本地预览",
                  likes: 0,
                  reply: reply || undefined,
                  quote: quote || undefined,
                },
              ]);
              setText("");
              setReply("");
              setQuote("");
              setSort("最新");
            }}
          >
            <Send size={13} />
            发表想法
          </SpringButton>
        </div>
      </div>
      <div className="comments-toolbar">
        <span>所有回声</span>
        <div>
          {["热度", "最新"].map((s) => (
            <button
              className={sort === s ? "active" : ""}
              key={s}
              onClick={() => setSort(s)}
            >
              {s}
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
                {c.author && <span className="author-badge">作者</span>}
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
                  aria-label={`点赞 ${c.name} 的评论`}
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
                  回复
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
      <p className="discussion-demo">
        评论及互动数量为界面演示，新增内容只在当前页面预览。
      </p>
    </section>
  );
}
export function ReadingAnnotations() {
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
              标注
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
              引用评论
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {marked && (
        <div className="annotation-note">
          <span>
            <Highlighter size={14} />
            刚刚划下的一句
          </span>
          <p>{marked}</p>
          <small>本页标注预览</small>
          <button aria-label="关闭标注" onClick={() => setMarked("")}>
            <X size={13} />
          </button>
        </div>
      )}
    </>
  );
}
export function RichArticleDetails() {
  const [copied, setCopied] = useState(false);
  const snippet =
    'const life = {\n  curiosity: Infinity,\n  pace: "your own",\n  roomForWonder: true\n};';
  return (
    <div className="rich-article-details">
      <aside className="article-callout">
        <span>✳</span>
        <div>
          <strong>写在页边</strong>
          <p>
            真正值得优化的，也许不是每一分钟的产出，而是
            <mark>我们和时间相处的方式</mark>。给想法留一点生长的空间。
            <a href="#footnote-1" className="footnote-link">
              [1]
            </a>
          </p>
        </div>
      </aside>
      <blockquote className="editorial-quote">
        <Quote size={23} />
        <p>
          空白不是浪费，
          <br />
          它是让想法长出根的地方。
        </p>
        <cite>— 这篇文章里，我最想留给你的话</cite>
      </blockquote>
      <div className="article-code">
        <div>
          <span>给生活留一点余地.ts</span>
          <button
            aria-label="复制代码"
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
        <pre data-custom-scroll="代码示例">
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
        <span>注释与延伸</span>
        <p>
          <sup>1</sup>{" "}
          这里展示正文高亮、旁注、引用、脚注与代码块的排版样式。选中正文中的一段文字，还可以预览标注与引用评论。
        </p>
      </div>
    </div>
  );
}
