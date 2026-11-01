export function dateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!match) return null;
  const [, y, m, d, h = "00", minute = "00"] = match;
  const date = new Date(Date.UTC(+y, +m - 1, +d));
  return date.getUTCFullYear() === +y &&
    date.getUTCMonth() === +m - 1 &&
    date.getUTCDate() === +d &&
    +h < 24 &&
    +minute < 60
    ? { year: +y, month: +m - 1, day: +d, hour: h, minute }
    : null;
}
export function dayKey(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month, day));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}
export function shiftDay(value: string, offset: number) {
  const parts = dateParts(value);
  if (!parts) throw new Error("INVALID_DATE");
  return dayKey(parts.year, parts.month, parts.day + offset);
}
export function monthDays(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}
