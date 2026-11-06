"use client";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import {
  PencilFrame,
  PencilLine,
  CoastGlyph,
} from "@/shared/ui/drawing/CoastalMarks";
import { HanddrawnMark } from "@/shared/ui/drawing/HanddrawnMark";
import { ContentHeading } from "@/modules/content/ui/layout/ContentHeading";
import styles from "./QuotesView.module.css";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  Copy,
  Heart,
  RotateCw,
} from "lucide-react";
import type { Quote } from "@/modules/content/domain/models";
import { useLocalState } from "@/shared/hooks/useLocalState";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { ProgressiveList } from "@/shared/ui/loading/ProgressiveList";

export function QuotesView({ quotes }: { quotes: Quote[] }) {
  const t = useTranslations("quotes");
  const feedback = useTranslations("feedback");
  const { notify } = useNotice();
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useLocalState<number[]>("adnaan-quotes", []);
  const [copied, setCopied] = useState(false);
  const quote = quotes[index % Math.max(quotes.length, 1)];
  const savedIndices = [...new Set(saved)].filter(
    (value) => Number.isInteger(value) && value >= 0 && !!quotes[value],
  );
  const isSaved = savedIndices.includes(index);
  function turn(step: number) {
    setIndex((value) => (value + step + quotes.length) % quotes.length);
    setCopied(false);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${quote.text}\n—— ${quote.author}`);
      setCopied(true);
      notify({ title: t("copied"), tone: "success" });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      notify({ title: t("failed"), tone: "error", duration: 6500 });
    }
  }
  if (!quote)
    return (
      <div className={`inner-page ${styles.quotes}`}>
        <ContentHeading
          room="quotes"
          title={t("title")}
          description={t("empty")}
        />
      </div>
    );
  return (
    <div className={`inner-page ${styles.quotes}`}>
      <ContentHeading
        room="quotes"
        title={t("title")}
        description={t("description")}
      />
      <div className={styles.layout}>
        <section className={styles.reader} aria-label={t("readingLabel")}>
          <div className={styles.letter}>
            <PencilFrame kind="note" className={styles.paper} />
            <div className={styles.letterTop}>
              <span className={styles.eyebrow}>
                <CoastGlyph kind="wind" />
                {t("current")}
              </span>
              <span className={styles.page} role="status">
                {t("page", { index: index + 1, total: quotes.length })}
              </span>
            </div>
            <span className={styles.quoteMark} aria-hidden>
              “
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.figure
                key={quote.id}
                className={styles.words}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <blockquote>{quote.text}</blockquote>
                <figcaption>
                  <span aria-hidden>—</span>
                  <cite>{quote.author}</cite>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
            <CoastalVignette
              kind={["sun", "tree", "boat", "mountain"][index % 4] as "sun"}
              className={styles.sketch}
            />
          </div>
          <div className={styles.toolbar}>
            <div className={styles.turnControls}>
              <IconButton
                aria-label={t("previous")}
                disabled={quotes.length < 2}
                onClick={() => turn(-1)}
                className={styles.previous}
              >
                <ChevronLeft size={17} />
              </IconButton>
              <Button
                className={styles.next}
                disabled={quotes.length < 2}
                onClick={() => turn(1)}
              >
                <RotateCw size={15} />
                {t("next")}
                <HanddrawnMark className={styles.turnMark} />
              </Button>
            </div>
            <div className={styles.keepControls}>
              <Button
                className={styles.keep}
                aria-label={isSaved ? t("unsave") : t("save")}
                aria-pressed={isSaved}
                onClick={() => {
                  notify({
                    title: isSaved ? feedback("removed") : t("saved"),
                    tone: "success",
                  });
                  setSaved((values) =>
                    isSaved
                      ? values.filter((value) => value !== index)
                      : [...values, index],
                  );
                }}
              >
                <Heart size={17} fill={isSaved ? "currentColor" : "none"} />
                <span>{t(isSaved ? "kept" : "keep")}</span>
              </Button>
              <IconButton
                aria-label={t("copy")}
                onClick={copy}
                className={styles.copy}
              >
                {copied ? <Check size={17} /> : <Copy size={17} />}
              </IconButton>
            </div>
          </div>
          <p className={styles.hint}>
            {t(quotes.length < 2 ? "singleHint" : "hint")}
          </p>
        </section>
        <aside
          className={styles.collection}
          aria-labelledby="saved-quotes-heading"
        >
          <div className={styles.collectionTop}>
            <div>
              <span className={styles.collectionEyebrow}>
                {t("collectionEyebrow")}
              </span>
              <h2 id="saved-quotes-heading">
                {t("collection")}
                <span className={styles.count}>{savedIndices.length}</span>
              </h2>
            </div>
            <Heart size={18} aria-hidden />
          </div>
          <PencilLine className={styles.collectionLine} kind="trail" />
          {savedIndices.length ? (
            <ProgressiveList
              items={savedIndices.slice().reverse()}
              className={styles.savedList}
            >
              {(value, i) => (
                <Button
                  key={quotes[value].id}
                  className={styles.savedQuote}
                  aria-pressed={index === value}
                  onClick={() => {
                    setIndex(value);
                    setCopied(false);
                  }}
                >
                  <span className={styles.savedNumber}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.savedWords}>
                    <span>{quotes[value].text}</span>
                    <small>{quotes[value].author}</small>
                  </span>
                  <ArrowUpRight size={16} className={styles.savedArrow} />
                  {index === value && (
                    <HanddrawnMark className={styles.selectedMark} />
                  )}
                </Button>
              )}
            </ProgressiveList>
          ) : (
            <div className={styles.emptyCollection}>
              <CoastGlyph kind="leaf" />
              <p>{t("collectionEmpty")}</p>
              <span>{t("collectionHelp")}</span>
            </div>
          )}
          <p className={styles.collectionNote}>{t("collectionHint")}</p>
        </aside>
      </div>
    </div>
  );
}
