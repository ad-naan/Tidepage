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
import { ArrowUpRight, Check, Copy, Heart, RotateCw } from "lucide-react";
import type { Quote } from "@/modules/content/domain/models";
import { useLocalState } from "@/shared/hooks/useLocalState";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import { Button } from "@/shared/ui/button/Button";
import { softSpring } from "@/shared/lib/motion";

export function QuotesView({ quotes }: { quotes: Quote[] }) {
  const t = useTranslations("quotes");
  const feedback = useTranslations("feedback");
  const { notify } = useNotice();
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useLocalState<number[]>("adnaan-quotes", []);
  const [copied, setCopied] = useState(false);
  const quote = quotes[index % Math.max(quotes.length, 1)];
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
    <div className={`inner-page quotes-page ${styles.quotes}`}>
      <ContentHeading
        room="quotes"
        title={t("title")}
        description={t("description")}
      />
      <div className="quote-stage">
        <div className="quote-letter">
          <PencilFrame kind="note" />
          <span className="quote-index">
            <CoastGlyph kind="wind" />
            {t("page", { index: index + 1, total: quotes.length })}
          </span>
          <span className="big-quote">“</span>
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8, rotate: -0.4 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={softSpring}
            >
              <blockquote>{quote.text}</blockquote>
              <cite>— {quote.author}</cite>
            </motion.div>
          </AnimatePresence>
          <CoastalVignette
            kind={["sun", "tree", "boat", "mountain"][index % 4] as "sun"}
          />
        </div>
        <div className="quote-actions">
          <Button
            className="button-solid"
            onClick={() => {
              setIndex((v) => (v + 1) % quotes.length);
              setCopied(false);
            }}
          >
            <RotateCw size={16} />
            {t("next")}
            <HanddrawnMark className="quote-turn-mark" />
          </Button>
          <Button
            className={`icon-button ${saved.includes(index) ? "liked" : ""}`}
            aria-label={saved.includes(index) ? t("unsave") : t("save")}
            onClick={() => {
              notify({
                title: saved.includes(index) ? feedback("removed") : t("saved"),
                tone: "success",
              });
              setSaved((v) =>
                v.includes(index)
                  ? v.filter((n) => n !== index)
                  : [...v, index],
              );
            }}
          >
            <Heart
              size={19}
              fill={saved.includes(index) ? "currentColor" : "none"}
            />
          </Button>
          <Button className="icon-button" aria-label={t("copy")} onClick={copy}>
            {copied ? <Check size={19} /> : <Copy size={18} />}
          </Button>
        </div>
        <p className="quote-feedback">{t("hint")}</p>
      </div>
      {saved.length > 0 && (
        <div className="saved-quotes">
          <PencilLine kind="trail" />
          <h2>
            {t("collection")} <span>{saved.length}</span>
          </h2>
          {saved
            .filter((n) => !!quotes[n])
            .map((n) => (
              <Button key={n} onClick={() => setIndex(n)}>
                <span>{quotes[n].text.replace("\n", "")}</span>
                <ArrowUpRight size={16} />
                <PencilLine kind="fold" className="saved-quote-fold" />
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
