"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Highlighter, Quote, X } from "lucide-react";
import { Button } from "@/shared/ui/button/Button";
import type { DiscussionTarget } from "@/modules/engagement/domain/discussion";
import { CommentThread } from "./CommentThread";
export function Discussion({
  target,
  compact = false,
}: {
  target: DiscussionTarget;
  compact?: boolean;
}) {
  return <CommentThread target={target} compact={compact} />;
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
            <Button
              onClick={() => {
                setMarked(selection);
                setSelection("");
              }}
            >
              <Highlighter size={13} />
              {t("mark")}
            </Button>
            <Button
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("article-quote", { detail: selection }),
                );
                setSelection("");
              }}
            >
              <Quote size={13} />
              {t("quote")}
            </Button>
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
          <Button aria-label={t("closeMark")} onClick={() => setMarked("")}>
            <X size={13} />
          </Button>
        </div>
      )}
    </>
  );
}
