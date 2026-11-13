import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { createShareImage } from "../../src/modules/site-settings/server/share-image";
import { GET } from "../../src/app/api/v1/share-image/route";
import { pageMetadata } from "../../src/server/seo/metadata";

test("Chinese and English share cards render offline as complete, bounded PNGs", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Share artwork must not require a remote font or image");
  });
  for (const locale of ["zh-CN", "en"] as const) {
    const response = await createShareImage({
      locale,
      article: {
        title:
          "Jev 模型入门与实践：一个“不说人话”的 AI，怎么用？ Building a quieter corner of the web",
        date: "2026-11-13",
        category: "technology",
      },
    });
    assert.match(response.headers.get("content-type") ?? "", /image\/png/);
    const bytes = Buffer.from(await response.arrayBuffer());
    const image = await sharp(bytes).metadata();
    assert.equal(image.width, 1200);
    assert.equal(image.height, 630);
    assert.ok(
      bytes.length < 500_000,
      "Card should remain light enough to share",
    );
  }
});

test("invalid share routes are rejected before accessing site or article data", async () => {
  for (const query of [
    "locale=unknown",
    "article=",
    "article=../draft",
    "article=Not-Published",
  ]) {
    const response = await GET(
      new Request(`http://localhost/api/v1/share-image?${query}`),
    );
    assert.equal(response.status, 404);
  }
});

test("social metadata uses a locale-specific card and preserves a custom uploaded cover", () => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
  const identity = {
    name: "My journal",
    title: "My journal",
    description: "Notes",
  };
  const english = pageMetadata(
    "/",
    identity.title,
    identity.description,
    "en",
    ["en"],
    identity,
  );
  assert.match(
    JSON.stringify(english.openGraph?.images),
    /share-image\?locale=en/,
  );
  assert.deepEqual(english.openGraph?.images, english.twitter?.images);
  const uploaded = pageMetadata(
    "/",
    identity.title,
    identity.description,
    "en",
    ["en"],
    {
      ...identity,
      shareImage: {
        path: `/uploads/${"a".repeat(64)}.png`,
        alt: "My own cover",
      },
    },
  );
  assert.doesNotMatch(
    JSON.stringify(uploaded.openGraph?.images),
    /share-image/,
  );
  assert.match(JSON.stringify(uploaded.twitter?.images), /My own cover/);
});
