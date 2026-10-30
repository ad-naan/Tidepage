"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { softSpring, spring } from "@/shared/lib/motion";

import { useLocale, useMessages, useTranslations } from "next-intl";
export function SkyPlayground({
  expanded,
  onPlay,
}: {
  expanded: boolean;
  onPlay: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("sky");
  const foundLines = useMessages().sky.lines;
  const [clock, setClock] = useState("");
  const [minutes, setMinutes] = useState(0);
  const [showStay, setShowStay] = useState(false);
  const [found, setFound] = useState<number | null>(null);
  useEffect(() => {
    const started = performance.now();
    const update = () => {
      setClock(
        new Intl.DateTimeFormat(locale, {
          timeZone: "Asia/Shanghai",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date()),
      );
      setMinutes(Math.floor((performance.now() - started) / 60000));
    };
    update();
    const timer = setInterval(update, 15000);
    return () => clearInterval(timer);
  }, [locale]);
  useEffect(() => {
    if (expanded) setFound(null);
  }, [expanded]);
  return (
    <div className="sky-playground">
      <svg
        className="sky-air"
        viewBox="0 0 225 490"
        fill="none"
        aria-hidden="true"
      >
        <g stroke="currentColor" strokeWidth=".7" strokeLinecap="round">
          <path d="m18 329 0 14m0-7-5-4m5 4 5-5M10 322l1-4" />
          <path d="m99 38 2-4 1 4 4 1-4 1-1 4-2-4-4-1Z" opacity=".55" />
          <path d="M10 391Q40 398 62 387T111 389M21 399q24 5 41-1m14-4 13 2" />
          <path d="M23 405q-9 9-2 17m-2 9 2 2" strokeDasharray="1 4" />
        </g>
        <circle cx="42" cy="198" r="1" fill="currentColor" />
        <circle cx="16" cy="335" r=".8" fill="currentColor" />
      </svg>
      <svg
        className="sky-time-orbit"
        viewBox="0 0 225 490"
        fill="none"
        aria-hidden="true"
      >
        <g stroke="currentColor" strokeWidth=".65">
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d={i % 3 === 0 ? "M57 200v4" : "M57 201v2"}
              transform={`rotate(${i * 30} 57 245)`}
            />
          ))}
        </g>
      </svg>
      <motion.button
        className={`sky-clock ${showStay ? "showing-stay" : ""}`}
        aria-label={t("toggleClock")}
        onClick={() => setShowStay((v) => !v)}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.94 }}
        transition={spring}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={showStay ? "stay" : "now"}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.15 }}
          >
            {showStay
              ? minutes < 1 ? t("moment") : t("minutes", { count: minutes })
              : clock || t("now")}
          </motion.span>
        </AnimatePresence>
        <span className="sky-clock-caption">
          {showStay ? t("stay") : t("now")}
        </span>
      </motion.button>
      <motion.button
        className="sky-paper-boat"
        drag="x"
        dragSnapToOrigin
        dragConstraints={{ left: -10, right: 22 }}
        dragElastic={0.2}
        aria-label={t("boat")}
        onClick={() => {
          onPlay();
          setFound((v) => (v === null ? 0 : (v + 1) % foundLines.length));
        }}
        whileHover={{ y: -2, rotate: -3 }}
        whileTap={{ scale: 0.95, y: 1 }}
        transition={softSpring}
      >
        <svg viewBox="0 0 55 42" fill="none" aria-hidden="true">
          <path
            d="m4 23 23-20 24 20-9 13H14Z"
            fill="var(--paper)"
            stroke="currentColor"
            strokeWidth=".9"
          />
          <path
            d="M27 3v26M4 23l23 6 24-6M14 36l13-7 15 7M14 23l13-20 14 20"
            stroke="currentColor"
            strokeWidth=".65"
          />
          <path
            d="M5 39h13m7 1h23"
            stroke="currentColor"
            strokeWidth=".7"
            opacity=".4"
          />
        </svg>
        <span>{t("pick")}</span>
      </motion.button>
      <AnimatePresence mode="wait">
        {found !== null && (
          <motion.div
            key={found}
            className="sky-found-line"
            initial={{ opacity: 0, y: 9, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={softSpring}
          >
            <span>“</span>
            <p>{foundLines[found]}</p>
            <button aria-label={t("keepLabel")} onClick={() => setFound(null)}>
              {t("keep")} <span>↗</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
