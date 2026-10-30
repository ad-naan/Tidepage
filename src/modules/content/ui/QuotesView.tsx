"use client";
import { RoomHeading } from "@/components/RoomHeading";
import styles from "@/components/rooms.module.css";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check, Copy, Heart, RotateCw } from "lucide-react";
import type { Quote } from "../domain/models";
import { useLocalState } from "@/shared/hooks/useLocalState";
import { MiniSketch } from "@/components/Sketch";
import { SpringButton } from "@/shared/ui/primitives";
import { softSpring } from "@/shared/lib/motion";

export function QuotesView({ quotes }: { quotes: Quote[] }) {
  const t = useTranslations("quotes");
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useLocalState<number[]>("adnaan-quotes", []);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const quote = quotes[index % Math.max(quotes.length, 1)];
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${quote.text}\n—— ${quote.author}`);
      setCopied(true);
      setCopyFailed(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyFailed(true);
    }
  }
  if (!quote)
    return (
      <div className={`inner-page ${styles.quotes}`}>
        <RoomHeading
          room="quotes"
          title={t("title")}
          description={t("empty")}
        />
      </div>
    );
  return (
    <div className={`inner-page quotes-page ${styles.quotes}`}>
      <RoomHeading
        room="quotes"
        title={t("title")}
        description={t("description")}
      />
      <div className="quote-stage">
        <span className="quote-index">
          {t("page", { index: index + 1, total: quotes.length })}
        </span>
        <span className="big-quote">“</span>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 22, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={softSpring}
          >
            <blockquote>{quote.text}</blockquote>
            <cite>— {quote.author}</cite>
          </motion.div>
        </AnimatePresence>
        <MiniSketch
          kind={["sun", "tree", "boat", "mountain"][index % 4] as "sun"}
        />
        <div className="quote-actions">
          <SpringButton
            className="button-solid"
            onClick={() => {
              setIndex((v) => (v + 1) % quotes.length);
              setCopied(false);
              setCopyFailed(false);
            }}
          >
            <RotateCw size={16} />
            {t("next")}
          </SpringButton>
          <SpringButton
            className={`icon-button ${saved.includes(index) ? "liked" : ""}`}
            label={saved.includes(index) ? t("unsave") : t("save")}
            onClick={() =>
              setSaved((v) =>
                v.includes(index)
                  ? v.filter((n) => n !== index)
                  : [...v, index],
              )
            }
          >
            <Heart
              size={19}
              fill={saved.includes(index) ? "currentColor" : "none"}
            />
          </SpringButton>
          <SpringButton
            className="icon-button"
            label={t("copy")}
            onClick={copy}
          >
            {copied ? <Check size={19} /> : <Copy size={18} />}
          </SpringButton>
        </div>
        <div className="quote-feedback" role="status">
          {copied
            ? t("copied")
            : copyFailed
              ? t("failed")
              : saved.includes(index)
                ? t("saved")
                : t("hint")}
        </div>
      </div>
      {saved.length > 0 && (
        <div className="saved-quotes">
          <h2>
            {t("collection")} <span>{saved.length}</span>
          </h2>
          {saved
            .filter((n) => !!quotes[n])
            .map((n) => (
              <button key={n} onClick={() => setIndex(n)}>
                <span>{quotes[n].text.replace("\n", "")}</span>
                <ArrowUpRight size={16} />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
