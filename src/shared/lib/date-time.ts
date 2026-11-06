import { site } from "@/shared/config/site";

export type DateInput = string | number | Date;
export type DateDisplay = "date" | "datetime" | "activity";
const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify([locale, options]);
  let value = formatters.get(key);
  if (!value) {
    if (formatters.size >= 64)
      formatters.delete(formatters.keys().next().value!);
    value = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, value);
  }
  return value;
}

function parsed(value: DateInput) {
  const dateOnly =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  // Calendar dates have no time zone; do not shift them into the previous/next day.
  if (
    typeof value === "string" &&
    !dateOnly &&
    !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
  )
    return null;
  if (typeof value === "string") {
    const calendar = value.slice(0, 10);
    const checked = new Date(`${calendar}T00:00:00Z`);
    if (!Number.isFinite(checked.getTime()) || checked.toISOString().slice(0, 10) !== calendar) return null;
  }
  const date = new Date(value instanceof Date ? value.getTime() : value);
  if (!Number.isFinite(date.getTime())) return null;
  if (dateOnly && date.toISOString().slice(0, 10) !== value) return null;
  return { date, dateOnly, timeZone: dateOnly ? "UTC" : site.timeZone };
}

/** Absolute publication dates and audit timestamps always include the year. */
export function formatDate(
  value: DateInput,
  locale: string,
  mode: "date" | "datetime" = "date",
) {
  const input = parsed(value);
  if (!input) return "";
  return formatter(locale, {
    timeZone: input.timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(mode === "datetime" && !input.dateOnly
      ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const }
      : {}),
  }).format(input.date);
}

/** Machine-facing calendar keys use the same site time zone as public timestamps. */
export function dateKey(value: DateInput) {
  const input = parsed(value);
  if (!input) return "";
  const parts = formatter("en-US", {
    timeZone: input.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(input.date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Decorative archive columns may split day/month, retaining the full date in title/ARIA. */
export function calendarParts(value: DateInput, locale: string) {
  const input = parsed(value);
  if (!input) return { day: "", month: "", year: "" };
  const get = (options: Intl.DateTimeFormatOptions) =>
    formatter(locale, { timeZone: input.timeZone, ...options }).format(
      input.date,
    );
  return {
    day: get({ day: "2-digit" }),
    month: get({ month: "short" }),
    year: get({ year: "numeric" }),
  };
}

/** Activity: <1 min just-now; <1 h minutes; <24 h hours; <7 d days; then an absolute date. */
export function timePresentation(
  value: DateInput,
  locale: string,
  mode: DateDisplay,
  now: number | null = null,
) {
  const input = parsed(value);
  if (!input) return null;
  const absolute = formatDate(
    value,
    locale,
    input.dateOnly ? "date" : "datetime",
  );
  const title = input.dateOnly
    ? absolute
    : formatter(locale, {
        timeZone: site.timeZone,
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZoneName: "shortOffset",
      }).format(input.date);
  const base = {
    dateTime: input.dateOnly ? String(value) : input.date.toISOString(),
    absolute: title,
    label: mode === "date" ? formatDate(value, locale) : absolute,
    justNow: false,
  };
  // A null clock keeps SSR and the first hydration render identical. Date-only values never become relative.
  if (mode !== "activity" || input.dateOnly || now === null) return base;
  const elapsed = now - input.date.getTime();
  if (elapsed < 0) return base;
  if (elapsed < minute) return { ...base, justNow: true };
  if (elapsed < 7 * day) {
    const unit = elapsed < hour ? "minute" : elapsed < day ? "hour" : "day";
    const divisor = unit === "minute" ? minute : unit === "hour" ? hour : day;
    return {
      ...base,
      label: new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(
        -Math.floor(elapsed / divisor),
        unit,
      ),
    };
  }
  const year = (date: Date) =>
    formatter("en-US", { timeZone: site.timeZone, year: "numeric" }).format(
      date,
    );
  return {
    ...base,
    label: formatter(locale, {
      timeZone: site.timeZone,
      ...(year(input.date) === year(new Date(now))
        ? {}
        : { year: "numeric" as const }),
      month: "short",
      day: "numeric",
    }).format(input.date),
  };
}
