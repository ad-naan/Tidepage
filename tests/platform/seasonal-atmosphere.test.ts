import { test } from "node:test";
import assert from "node:assert/strict";
import { seasonalAtmosphere } from "../../src/shared/lib/seasonal-atmosphere";

test("seasonal atmosphere follows the site's Shanghai calendar across UTC midnight", () => {
  const seasons = [
    "winter",
    "winter",
    "spring",
    "spring",
    "spring",
    "summer",
    "summer",
    "summer",
    "autumn",
    "autumn",
    "autumn",
    "winter",
  ];
  seasons.forEach((season, index) =>
    assert.equal(
      seasonalAtmosphere(Date.UTC(2026, index, 15, 4))?.season,
      season,
    ),
  );
  assert.equal(seasonalAtmosphere("2026-02-28T15:59:00Z")?.season, "winter");
  assert.equal(seasonalAtmosphere("2026-02-28T16:00:00Z")?.season, "spring");
  assert.equal(seasonalAtmosphere("2026-11-30T16:00:00Z")?.season, "winter");
  assert.equal(seasonalAtmosphere("invalid"), null);
});

test("dawn, day, dusk and night change at the configured local hour", () => {
  const cases = [
    ["2026-11-13T20:59:00Z", "night"],
    ["2026-11-13T21:00:00Z", "dawn"],
    ["2026-11-13T23:59:00Z", "dawn"],
    ["2026-11-14T00:00:00Z", "day"],
    ["2026-11-14T08:59:00Z", "day"],
    ["2026-11-14T09:00:00Z", "dusk"],
    ["2026-11-14T11:59:00Z", "dusk"],
    ["2026-11-14T12:00:00Z", "night"],
  ];
  for (const [date, daylight] of cases)
    assert.equal(seasonalAtmosphere(date)?.daylight, daylight);
});
