import { test } from "node:test";
import assert from "node:assert/strict";
import { articlesTable } from "../../src/modules/content/infrastructure/schema";
import { articleFixtures, createContentTestStore } from "../fixtures/content";

test("PostgreSQL content honors publication and summary boundaries", async () => {
  const store = await createContentTestStore();
  const { db, service } = store;
  try {
    const source = articleFixtures[0];
    const row = {
      slug: source.slug,
      locale: source.locale,
      title: source.title,
      excerpt: source.excerpt,
      category: source.category,
      tags: source.tags,
      minutes: source.minutes,
      sketch: source.sketch,
      sections: source.sections,
      body: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Structured body" }],
          },
        ],
      },
      visibility: "published" as const,
      publishedAt: new Date("2020-01-01"),
      updatedAt: new Date("2020-01-02"),
    };
    await db
      .insert(articlesTable)
      .values([
        row,
        { ...row, locale: "en", title: "AI: the English edition" },
        { ...row, slug: "draft-only", visibility: "draft", publishedAt: null },
        { ...row, slug: "scheduled-only", publishedAt: new Date("2099-01-01") },
      ]);
    const all = await service.allArticles();
    assert.equal(all.length, 1);
    const english = await service.allArticles("en");
    assert.equal(english.length, 1);
    assert.equal(english[0].title, "AI: the English edition");
    assert.equal(
      (await service.articleBySlug(source.slug, "en"))?.locale,
      "en",
    );
    assert.deepEqual((await service.articleLocales(source.slug)).sort(), [
      "en",
      "zh-CN",
    ]);
    assert.equal("sections" in all[0], false);
    assert.equal("body" in all[0], false);
    assert.equal(
      (await service.articleBySlug(source.slug))?.body?.content?.[0]
        .content?.[0].text,
      "Structured body",
    );
    assert.equal(await service.articleBySlug("draft-only"), null);
    assert.equal(await service.articleBySlug("scheduled-only"), null);
    assert.ok((await service.articleBySlug(source.slug))?.sections.length);
    assert.equal(
      (await service.listArticles({ q: "AI", pageSize: 1 })).total,
      1,
    );
    assert.equal((await service.listArticles({ q: "%" })).total, 0);
    assert.equal((await service.listArticles({ q: "' OR 1=1 --" })).total, 0);
    assert.equal(
      (await service.listArticles({ page: 2, pageSize: 1 })).items.length,
      0,
    );
  } finally {
    await store.close();
  }
});
