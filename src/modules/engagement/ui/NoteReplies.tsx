"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MessageCircle, Send } from "lucide-react";
import { usePreviewIdentity } from "@/modules/identity/ui/PreviewIdentity";
import { softSpring } from "@/shared/lib/motion";
export function NoteReplies() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const { loggedIn, openLogin } = usePreviewIdentity();
  return (
    <div className="note-replies">
      <button
        className="note-reply-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <MessageCircle size={14} />
        {open ? "收起讨论" : "聊聊这个瞬间"}
        <span>{reply ? 2 : 1}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="note-reply-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={softSpring}
          >
            <div className="note-reply-item">
              <span>木</span>
              <p>
                <strong>木木</strong>小事也值得被认真记住。
                <small>示例评论</small>
              </p>
            </div>
            {reply && (
              <div className="note-reply-item">
                <span>访</span>
                <p>
                  <strong>演示访客</strong>
                  {reply}
                  <small>刚刚 · 本地预览</small>
                </p>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                if (!loggedIn) {
                  openLogin();
                  return;
                }
                setReply(text.trim());
                setText("");
              }}
            >
              <input
                value={text}
                maxLength={300}
                onChange={(e) => setText(e.target.value)}
                aria-label="回复手记"
                placeholder="交换一点想法…"
              />
              <button aria-label="发表手记回复" disabled={!text.trim()}>
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
