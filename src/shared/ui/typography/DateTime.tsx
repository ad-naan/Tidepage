"use client";
import { useLocale, useTranslations } from "next-intl";
import { useRelativeClock } from "@/shared/hooks/useRelativeClock";
import {
  calendarParts,
  timePresentation,
  type DateInput,
  type DateDisplay,
} from "@/shared/lib/date-time";

/** Semantic timestamp: concise visible copy, exact accessible time, shared relative clock. */
export function DateTime({
  value,
  mode = "date",
  className,
  layout = "inline",
}: {
  value: DateInput;
  mode?: DateDisplay;
  className?: string;
  layout?: "inline" | "calendar";
}) {
  const locale = useLocale();
  const t = useTranslations("ui.dateTime");
  const now = useRelativeClock(mode === "activity");
  const presentation = timePresentation(value, locale, mode, now);
  if (!presentation)
    return <span className={className}>{t("unavailable")}</span>;
  const label = presentation.justNow ? t("justNow") : presentation.label;
  const parts = layout === "calendar" ? calendarParts(value, locale) : null;
  return (
    <time
      className={className}
      dateTime={presentation.dateTime}
      title={presentation.absolute}
      aria-label={
        mode === "activity"
          ? `${label} · ${presentation.absolute}`
          : parts
            ? presentation.absolute
            : undefined
      }
    >
      {parts ? (
        <>
          <span>{parts.day}</span>
          <small>{parts.month}</small>
        </>
      ) : (
        label
      )}
    </time>
  );
}
