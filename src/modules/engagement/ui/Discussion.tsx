"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Quote } from "lucide-react";
import { Button } from "@/shared/ui/button/Button";
import type { DiscussionTarget } from "@/modules/engagement/domain/discussion";
import { useNearViewport } from "@/shared/hooks/useNearViewport";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
import { KeepQuote } from "@/modules/journal/ui/Journal";
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
        <div aria-hidden="true">
          <LoadingSkeleton variant="rows" />
        </div>
      )}
    </div>
  );
}
export function ReadingQuoteSelection({
  article,
}: {
  article?: { slug: string; title: string };
}) {
  const t = useTranslations("discussion");
  const reduced = useReducedMotion();
  const [selection, setSelection] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  useEffect(() => {
    function capture(event: Event) {
      if (
        event.target instanceof Element &&
        event.target.closest(".selection-toolbar")
      )
        return;
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        setSelection("");
        return;
      }
      const s = window.getSelection();
      const text = s?.toString().trim();
      const element = s?.anchorNode?.parentElement;
      const body = element?.closest("[data-reading-body]");
      if (
        !text ||
        !s?.rangeCount ||
        !body ||
        !s.focusNode ||
        !body.contains(s.focusNode) ||
        text.length > 500
      ) {
        setSelection("");
        return;
      }
      const rect = s!.getRangeAt(0).getBoundingClientRect();
      setSelection(text);
      setPosition({
        top: Math.max(10, Math.min(window.innerHeight - 60, rect.top - 46)),
        left: Math.max(
          12,
          Math.min(window.innerWidth - 290, rect.left + rect.width / 2 - 135),
        ),
      });
    }
    document.addEventListener("pointerup", capture);
    document.addEventListener("keyup", capture);
    document.addEventListener("selectionchange", capture);
    const clear = () => setSelection("");
    window.addEventListener("scroll", clear);
    window.addEventListener("resize", clear);
    return () => {
      document.removeEventListener("pointerup", capture);
      document.removeEventListener("keyup", capture);
      document.removeEventListener("selectionchange", capture);
      window.removeEventListener("scroll", clear);
      window.removeEventListener("resize", clear);
    };
  }, []);
  return (
    <>
      <AnimatePresence>
        {selection && (
          <motion.div
            className="selection-toolbar"
            style={position}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.16 }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {article && (
              <KeepQuote
                text={selection}
                title={article.title}
                href={`/articles/${article.slug}`}
              />
            )}
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
    </>
  );
}
