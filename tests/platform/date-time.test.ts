import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calendarParts,
  dateKey,
  formatDate,
  timePresentation,
} from "../../src/shared/lib/date-time";

const now = Date.parse("2026-11-07T02:00:00+08:00");
const ago = (milliseconds: number) =>
  new Date(now - milliseconds).toISOString();
const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

test("activity dates switch at minute, hour, day and week boundaries", () => {
  assert.equal(
    timePresentation(ago(59_999), "zh-CN", "activity", now)?.justNow,
    true,
  );
  for (const [elapsed, label] of [
    [minute, "1分钟前"],
    [59 * minute, "59分钟前"],
    [hour, "1小时前"],
    [23 * hour, "23小时前"],
    [day, "1天前"],
    [7 * day - 1, "6天前"],
    [7 * day, "10月31日"],
  ] as const)
    assert.equal(
      timePresentation(ago(elapsed), "zh-CN", "activity", now)?.label,
      label,
    );
  assert.equal(
    timePresentation(ago(2 * hour), "en", "activity", now)?.label,
    "2 hours ago",
  );
});

test("absolute dates keep the year, old activities restore cross-year context, and future dates stay absolute", () => {
  assert.match(formatDate("2025-12-31", "zh-CN"), /2025/);
  assert.match(
    timePresentation("2025-12-31T10:00:00Z", "zh-CN", "activity", now)!.label,
    /2025/,
  );
  const future = timePresentation(
    new Date(now + hour),
    "zh-CN",
    "activity",
    now,
  )!;
  assert.equal(future.justNow, false);
  assert.equal(
    future.label,
    formatDate(new Date(now + hour), "zh-CN", "datetime"),
  );
  assert.match(future.absolute, /GMT\+8/);
  assert.equal(
    timePresentation(ago(minute), "zh-CN", "activity", null)?.label,
    formatDate(ago(minute), "zh-CN", "datetime"),
  );
});

test("calendar-only values never shift or become relative; instants use the site timezone", () => {
  assert.equal(dateKey("2026-11-06T16:30:00Z"), "2026-11-07");
  assert.equal(dateKey("2026-11-06"), "2026-11-06");
  assert.equal(formatDate("2026-11-06T16:30:00Z", "en"), "Nov 7, 2026");
  assert.equal(
    timePresentation("2026-11-07", "zh-CN", "activity", now)?.label,
    "2026年11月7日",
  );
  assert.deepEqual(calendarParts("2026-11-07", "en"), {
    day: "07",
    month: "Nov",
    year: "2026",
  });
  assert.equal(
    timePresentation(ago(minute), "zh-CN", "activity", now)?.dateTime,
    ago(minute),
  );
});

test("invalid dates and ambiguous local timestamps safely return no presentation", () => {
  for (const value of [
    "",
    "bad date",
    "2026-02-30",
    "2026-02-30T08:00:00Z",
    "2026-11-07T08:00:00",
    Number.NaN,
    new Date("bad"),
  ]) {
    assert.equal(timePresentation(value, "zh-CN", "activity", now), null);
    assert.equal(formatDate(value, "en"), "");
  }
});
