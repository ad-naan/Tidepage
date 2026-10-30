import { test } from "node:test";
import assert from "node:assert/strict";
import {
  articleBlockSchema,
  blockMarkdown,
} from "../../src/modules/content/domain/blocks";
import {
  articleSchema,
  summarize,
} from "../../src/modules/content/domain/models";
import { seedArticles } from "../../src/modules/content/infrastructure/demo-repository";
import { articleMarkdown } from "../../src/modules/content/application/markdown";

test("rich content validates external links, image sources, and bounded metadata", () => {
  const link = {
    type: "link",
    url: "https://nextjs.org/docs",
    title: "Next.js",
    description: "Documentation",
  };
  assert.equal(articleBlockSchema.safeParse(link).success, true);
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,hi",
    "file:///etc/passwd",
  ])
    assert.equal(articleBlockSchema.safeParse({ ...link, url }).success, false);
  for (const image of [
    "//untrusted.test/a.png",
    "javascript:alert(1)",
    "/\\untrusted.test/a.png",
  ])
    assert.equal(
      articleBlockSchema.safeParse({ ...link, image }).success,
      false,
    );
  assert.equal(
    articleBlockSchema.safeParse({ ...link, image: "/images/coast.png" })
      .success,
    true,
  );
  assert.equal(
    articleBlockSchema.safeParse({ ...link, title: "x".repeat(201) }).success,
    false,
  );
});

test("rich article blocks survive publishing but stay out of list summaries", () => {
  for (const locale of ["zh-CN", "en"] as const) {
    const article = articleSchema.parse(
      seedArticles.find(
        (a) => a.locale === locale && a.slug === "the-productivity-paradox",
      ),
    );
    const markdown = articleMarkdown(article, "https://example.com/article", {
      published: "Published",
      updated: "Updated",
      original: "Original",
    });
    assert.match(markdown, /https:\/\/www.sonyclassics.com\/theredturtle\//);
    assert.equal("sections" in summarize(article), false);
  }
  const code = blockMarkdown({
    type: "code",
    language: "js",
    code: "const x = '```';",
  });
  assert.ok(code.startsWith("````js\n"));
});
