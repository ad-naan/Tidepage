import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarParts } from "../../src/shared/lib/date-time";

test("Chinese archive columns contain bare day digits, preserving localized month labels", () => {
  assert.deepEqual(calendarParts("2026-09-30", "zh-CN"), {
    day: "30",
    month: "9月",
    year: "2026",
  });
  assert.deepEqual(calendarParts("2026-09-02", "zh-CN"), {
    day: "02",
    month: "9月",
    year: "2026",
  });
});
