"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Highlighter, Quote, X } from "lucide-react";
import { Button } from "@/shared/ui/button/Button";
import type { DiscussionTarget } from "@/modules/engagement/domain/discussion";
import { useNearViewport } from "@/shared/hooks/useNearViewport";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
const CommentThread = dynamic(
  () => import("./CommentThread").then((module) => module.CommentThread),
  { loading: () => <LoadingSkeleton variant="rows" /> },
);
export function Discussion({
  target,
  compact = false,
}: {
  target: DiscussionTarget;
  compact?: boolean;
}) {
  const locale = useLocale();
  return (
    <DeferredDiscussion
      key={`${target.type}:${target.id}:${locale}`}
      target={target}
      compact={compact}
    />
  );
}
function DeferredDiscussion({
  target,
  compact,
}: {
  target: DiscussionTarget;
  compact: boolean;
}) {
  const { ref, ready, activate } = useNearViewport<HTMLDivElement>();
  const [quote, setQuote] = useState<{ text: string; revision: number }>();
  const [focusRequest, setFocusRequest] = useState(0);
  useEffect(() => {
    if (target.type !== "article") return;
    function receive(event: Event) {
      const value = (event as CustomEvent<string>).detail;
      if (typeof value !== "string") return;
      setQuote({ text: value.slice(0, 500), revision: Date.now() });
      activate();
      ref.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
    window.addEventListener("article-quote", receive);
    function compose() {
      activate();
      setFocusRequest((value) => value + 1);
    }
    window.addEventListener("article-comment-compose", compose);
    return () => {
      window.removeEventListener("article-quote", receive);
      window.removeEventListener("article-comment-compose", compose);
    };
  }, [target.type]);
  return (
    <div ref={ref} style={{ minHeight: ready ? undefined : 240 }}>
      {ready ? (
        <CommentThread
          target={target}
          compact={compact}
          quote={quote}
          focusRequest={focusRequest}
        />
      ) : (
        <LoadingSkeleton variant="rows" />
      )}
    </div>
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
