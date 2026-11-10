import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dateParts,
  monthDays,
  shiftDay,
} from "../../src/shared/ui/date-picker/calendar";
import { isQuietNavigationPath } from "../../src/shared/config/navigation";
test("calendar navigation respects leap years and crosses month boundaries", () => {
  assert.equal(monthDays(2024, 1), 29);
  assert.equal(monthDays(2026, 1), 28);
  assert.equal(shiftDay("2024-02-28", 1), "2024-02-29");
  assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
  assert.equal(dateParts("2026-02-30"), null);
  assert.equal(dateParts("2026-11-01T25:00"), null);
  assert.deepEqual(dateParts("2026-11-01T08:35"), {
    year: 2026,
    month: 10,
    day: 1,
    hour: "08",
    minute: "35",
  });
});
test("workspace links use their own scroll container", () => {
  for (const path of [
    "/admin",
    "/zh-CN/admin/projects",
    "/en/admin/articles/new",
  ])
    assert.equal(isQuietNavigationPath(path), true);
  for (const path of ["/zh-CN/articles", "/en/about", "/zh-CN/administrator"])
    assert.equal(isQuietNavigationPath(path), false);
});
