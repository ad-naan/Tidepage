import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogs } from "../../src/i18n/catalogs";
import {
  locales,
  localeRegistry,
  defaultLocale,
} from "../../src/shared/i18n/config";
import { localeSwitchHref } from "../../src/shared/i18n/location";
import { languageAlternates } from "../../src/server/seo/metadata";

function shape(value: unknown, path = ""): string[] {
  if (Array.isArray(value))
    return value.flatMap((item, index) => shape(item, `${path}.${index}`));
  if (value !== null && typeof value === "object")
    return Object.entries(value).flatMap(([key, item]) =>
      shape(item, `${path}.${key}`),
    );
  return [`${path}:${typeof value}`];
}
test("every registered language has a complete, compatible catalog", async () => {
  const baseline = shape((await catalogs[defaultLocale]()).default).sort();
  for (const locale of locales) {
    assert.equal(typeof localeRegistry[locale].name, "string");
    assert.ok(localeRegistry[locale].name.length > 0);
    assert.deepEqual(
      shape((await catalogs[locale]()).default).sort(),
      baseline,
      locale,
    );
  }
});
test("switching a locale preserves filters, repeated parameters and the anchor", () => {
  const result = localeSwitchHref(
    "/articles",
    "category=technology&q=AI&tag=a&tag=b",
    "#main-content",
  );
  const url = new URL(result, "https://example.test");
  assert.equal(url.pathname, "/articles");
  assert.equal(url.searchParams.get("category"), "technology");
  assert.equal(url.searchParams.get("q"), "AI");
  assert.deepEqual(url.searchParams.getAll("tag"), ["a", "b"]);
  assert.equal(url.hash, "#main-content");
  assert.equal(localeSwitchHref("/", "", ""), "/");
  assert.throws(() => localeSwitchHref("//example.test", "", ""), /internal/);
});
test("hreflang references only the translations that are published", () => {
  const values = languageAlternates("/articles/example", [defaultLocale]);
  assert.equal(Object.keys(values).length, 2);
  assert.ok(
    values[localeRegistry[defaultLocale].hreflang].includes(
      `/${defaultLocale}/articles/example`,
    ),
  );
  assert.equal(
    values["x-default"],
    values[localeRegistry[defaultLocale].hreflang],
  );
});
