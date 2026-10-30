"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { MessageCircle, Send } from "lucide-react";
import { usePreviewIdentity } from "@/modules/identity/ui/PreviewIdentity";
import { softSpring } from "@/shared/lib/motion";
export function NoteReplies() {
  const t = useTranslations("notes.replies");
  const identity = useTranslations("identity");
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
        {open ? t("collapse") : t("open")}
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
              <span>{t("sampleName")[0]}</span>
              <p>
                <strong>{t("sampleName")}</strong>
                {t("sampleText")}
                <small>{t("sampleMeta")}</small>
              </p>
            </div>
            {reply && (
              <div className="note-reply-item">
                <span>{identity("guestBadge")}</span>
                <p>
                  <strong>{identity("guestName")}</strong>
                  {reply}
                  <small>{t("justNow")}</small>
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
                aria-label={t("input")}
                placeholder={t("placeholder")}
              />
              <button aria-label={t("submit")} disabled={!text.trim()}>
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
