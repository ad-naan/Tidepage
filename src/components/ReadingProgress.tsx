"use client";
import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/shared/i18n/navigation";
import styles from "./ReadingProgress.module.css";

/** Measures the article itself; comments and the footer don't dilute reading progress. */
export function ReadingProgress({ title }: { title: string }) {
  const t = useTranslations("header");
  const format = useFormatter();
  const reduced = useReducedMotion();
  const value = useMotionValue(0);
  const smooth = useSpring(value, { stiffness: 110, damping: 28 });
  const offset = useTransform(reduced ? value : smooth, (v) => 100 - v * 100);
  const [percent, setPercent] = useState(0);
  useEffect(() => {
    const article = document.querySelector(".prose");
    if (!article) return;
    let frame = 0;
    function measure() {
      frame = 0;
      const rect = article!.getBoundingClientRect();
      const progress = Math.max(
        0,
        Math.min(
          1,
          (innerHeight * 0.2 - rect.top) /
            Math.max(1, rect.height - innerHeight * 0.55),
        ),
      );
      value.set(progress);
      setPercent(Math.round(progress * 100));
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(measure);
    }
    const observer = new ResizeObserver(schedule);
    observer.observe(article);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [value]);
  return (
    <>
      <Link
        href="/articles"
        className={styles.back}
        aria-label={t("backToArticles")}
      >
        <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <circle className={styles.track} cx="18" cy="18" r="15.5" />
          <motion.circle
            className={styles.arc}
            cx="18"
            cy="18"
            r="15.5"
            pathLength="100"
            strokeDasharray="100 100"
            style={{ strokeDashoffset: offset }}
          />
        </svg>
        <ArrowLeft size={13} />
      </Link>
      <div className={styles.copy}>
        <span className={styles.caption}>
          {t("reading")}
          <i />
          <span
            className={styles.percent}
            role="progressbar"
            aria-label={t("readingProgress")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            {format.number(percent / 100, {
              style: "percent",
              maximumFractionDigits: 0,
            })}
          </span>
        </span>
        <strong>{title}</strong>
      </div>
    </>
  );
}
