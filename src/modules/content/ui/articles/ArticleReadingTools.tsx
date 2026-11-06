"use client";
import { useTranslations } from "next-intl";
import { useReducedMotion } from "motion/react";
import { ArrowUpCircle, MessageCircle } from "lucide-react";
import { Button } from "@/shared/ui/button/Button";
import {
  InteractionButton,
  EngagementStatus,
} from "@/modules/engagement/ui/EngagementActions";
import { AnimatedNumber } from "@/shared/ui/typography/AnimatedNumber";
import { PencilLine } from "@/shared/ui/drawing/CoastalMarks";
import { ArticleShareButton } from "./ArticleActions";
import styles from "./ArticleReadingTools.module.css";

export function ArticleReadingTools({
  slug,
  title,
  percent,
}: {
  slug: string;
  title: string;
  percent: number;
}) {
  const t = useTranslations("articles");
  const reduced = useReducedMotion();
  const target = { type: "article", id: slug } as const;
  return (
    <div className={styles.tools}>
      <PencilLine className={styles.rule} />
      <div
        className={styles.progress}
        role="progressbar"
        aria-label={t("readingProgress")}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle
            cx="10"
            cy="10"
            r="7"
            fill="none"
            stroke="var(--line)"
            strokeWidth="1.6"
          />
          <circle
            cx="10"
            cy="10"
            r="7"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.6"
            strokeDasharray={`${percent * 0.44} 44`}
            transform="rotate(-90 10 10)"
            strokeLinecap="round"
          />
        </svg>
        <span>
          <AnimatedNumber value={percent} />%
        </span>
      </div>
      <Button
        className={styles.top}
        onClick={() =>
          window.scrollTo({ top: 0, behavior: reduced ? "instant" : "smooth" })
        }
      >
        <ArrowUpCircle size={13} />
        {t("backToTop")}
      </Button>
      <div
        className={styles.actions}
        role="group"
        aria-label={t("readingTools")}
      >
        <InteractionButton target={target} kind="like" iconOnly showCount />
        <InteractionButton target={target} kind="save" iconOnly />
        <ArticleShareButton title={title} iconOnly className={styles.action} />
        <Button
          className={styles.action}
          aria-label={t("jumpComments")}
          title={t("jumpComments")}
          onClick={() => {
            const region = document.getElementById("article-comments");
            window.dispatchEvent(new Event("article-comment-compose"));
            region?.scrollIntoView({
              behavior: reduced ? "instant" : "smooth",
              block: "start",
            });
            region
              ?.querySelector<HTMLElement>('[role="textbox"]')
              ?.focus({ preventScroll: true });
          }}
        >
          <MessageCircle size={18} />
        </Button>
      </div>
      <EngagementStatus />
    </div>
  );
}
