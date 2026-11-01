"use client";
import { useTranslations } from "next-intl";
export function VisitorStatsPanel() {
  const t = useTranslations("stats");
  return (
    <div className="header-stats-panel">
      <p className="presence-note">{t("unavailable")}</p>
    </div>
  );
}
