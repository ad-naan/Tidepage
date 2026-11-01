"use client";
import { useTranslations } from "next-intl";
export function ActivityDetails() {
  const t = useTranslations("activity");
  return (
    <div className="activity-details">
      <p className="presence-note">{t("unavailable")}</p>
    </div>
  );
}
