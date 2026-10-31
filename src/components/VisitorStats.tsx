"use client";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
export function VisitorStatsPanel() {
  const t = useTranslations("stats");
  return (
    <div className="header-stats-panel">
      <div className="header-stats-intro">
        <span className="live-dot" />
        <p>
          {t("nowIntro")}
          <strong>{t("nowFriends")}</strong>
          {t("nowOutro")}
        </p>
      </div>
      <div className="header-stats-metrics">
        {[
          { value: 126, label: t("today"), key: "today" },
          { value: 12486, label: t("views"), key: "views" },
          { value: 3208, label: t("friends"), key: "friends" },
        ].map((item) => (
          <div key={item.key}>
            <span>{item.label}</span>
            <strong>
              <AnimatedNumber value={item.value} />
              {item.key === "today" && <ArrowUpRight size={17} />}
            </strong>
          </div>
        ))}
      </div>
      <div className="header-visits-chart">
        <div>
          <span>{t("trend")}</span>
          <span>{t("caption")}</span>
        </div>
        <svg
          viewBox="0 0 600 78"
          fill="none"
          preserveAspectRatio="none"
          role="img"
          aria-label={t("trendAria")}
        >
          <path
            d="M0 67C25 67 30 47 60 51S110 69 140 42 180 50 220 34 260 55 300 28 360 40 400 20 450 40 490 14 550 24 600 8V78H0Z"
            fill="var(--accent)"
            opacity=".055"
          />
          <motion.path
            d="M0 67C25 67 30 47 60 51S110 69 140 42 180 50 220 34 260 55 300 28 360 40 400 20 450 40 490 14 550 24 600 8"
            stroke="var(--accent)"
            strokeWidth="1.6"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </svg>
      </div>
      <div className="presence-note">
        {t("thanks")}
        <span>{t("demo")}</span>
      </div>
    </div>
  );
}
