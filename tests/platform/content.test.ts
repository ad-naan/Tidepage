import { test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { articlesTable } from "../../src/modules/content/infrastructure/schema";
import { articleFixtures, createContentTestStore } from "../fixtures/content";
import { usersTable } from "../../src/modules/identity/infrastructure/schema";
import { publishArticle } from "../../src/modules/content/server/publish-article";
import {
  newArticle,
  translationOf,
} from "../../src/modules/content/domain/editor-document";
import { legacyArticlesToDraft } from "../../src/modules/content/domain/legacy-draft";
import { workbenchRecords } from "../../src/server/workbench/records";
import type { Database } from "../../src/server/db/client";

test("PostgreSQL content honors publication and summary boundaries", async () => {
  const store = await createContentTestStore();
  const { db, repository, service } = store;
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
        { ...row, slug: "z-last", title: "Other title", excerpt: "", tags: [] },
      ]);
    const all = await service.allArticles();
    assert.equal(all.length, 2);
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
    assert.deepEqual(
      await repository.visibleIds(
        "article",
        [source.slug, "draft-only", "scheduled-only"],
        "zh-CN",
      ),
      [source.slug],
    );
    assert.deepEqual(
      await repository.visibleIds("article", ["missing"], "en"),
      [],
    );
    assert.ok((await service.articleBySlug(source.slug))?.sections.length);
    assert.equal(
      (await service.listArticles({ q: "AI", pageSize: 1 })).total,
      1,
    );
    assert.equal((await service.listArticles({ q: "%" })).total, 0);
    assert.equal((await service.listArticles({ q: "' OR 1=1 --" })).total, 0);
    const emptyPage = await service.listArticles({ page: 3, pageSize: 1 });
    assert.deepEqual(emptyPage.items, []);
    assert.equal(emptyPage.total, 2);
    assert.equal(
      (await repository.nextArticle(source.slug, "zh-CN"))?.slug,
      "z-last",
    );
    assert.equal(await repository.nextArticle("z-last", "zh-CN"), undefined);
  } finally {
    await store.close();
  }
});

test("article publishing uses the saved revision and protects public slugs", async () => {
  const fixture = await createContentTestStore();
  const db = fixture.db as unknown as Database;
  try {
    const [{ id: ownerId }, { id: anotherOwner }] = await fixture.db
      .insert(usersTable)
      .values([{ displayName: "Owner" }, { displayName: "Other owner" }])
      .returning();
    const workbench = workbenchRecords(db);
    const source = articleFixtures[0];
    const draft = legacyArticlesToDraft([source]);
    draft.id = "new-draft";
    draft.revision = 1;
    draft.publishedAt = "";
    draft.translations["zh-CN"].seoTitle = "Search title";
    draft.translations["zh-CN"].afterword = {
      note: "Why I wrote this",
      updates: [{ date: "2026-11-11", text: "A later thought" }],
    };
    await workbench.write(ownerId, "articles", 0, [draft]);
    await assert.rejects(
      publishArticle(
        ownerId,
        { id: draft.id, locale: "zh-CN", revision: 2 },
        db,
      ),
      { status: 409 },
    );
    await assert.rejects(
      publishArticle(ownerId, { id: draft.id, locale: "en", revision: 1 }, db),
      { status: 400 },
    );
    const request = { id: draft.id, locale: "zh-CN", revision: 1 };
    await publishArticle(ownerId, request, db);
    const article = await fixture.service.articleBySlug(source.slug);
    assert.equal(article?.publication?.seoTitle, "Search title");
    assert.deepEqual(
      article?.publication?.afterword,
      draft.translations["zh-CN"].afterword,
    );
    assert.deepEqual(
      legacyArticlesToDraft([article!]).translations["zh-CN"].afterword,
      draft.translations["zh-CN"].afterword,
    );
    assert.deepEqual(
      article?.body,
      JSON.parse(JSON.stringify(draft.translations["zh-CN"].body)),
    );
    await publishArticle(ownerId, request, db);
    assert.deepEqual(await fixture.service.articleBySlug(source.slug), article);

    const competing = newArticle("competing");
    competing.revision = 1;
    competing.translations["zh-CN"] = translationOf(draft, "zh-CN");
    await workbench.write(anotherOwner, "articles", 0, [competing]);
    await assert.rejects(
      publishArticle(anotherOwner, { ...request, id: competing.id }, db),
      { status: 409 },
    );

    draft.revision = 2;
    draft.translations["zh-CN"].slug = "renamed";
    await workbench.write(ownerId, "articles", 1, [draft]);
    await assert.rejects(
      publishArticle(ownerId, { ...request, revision: 2 }, db),
      { status: 409 },
    );
    assert.equal(await fixture.service.articleBySlug("renamed"), null);

    draft.revision = 3;
    draft.translations.en = {
      ...translationOf(draft, "zh-CN"),
      title: "Scheduled English",
    };
    draft.publishedAt = "2099-01-01T12:30";
    await workbench.write(ownerId, "articles", 2, [draft]);
    await publishArticle(
      ownerId,
      { ...request, locale: "en", revision: 3 },
      db,
    );
    assert.equal(await fixture.service.articleBySlug("renamed", "en"), null);
    const [scheduled] = await fixture.db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.locale, "en"));
    assert.equal(
      scheduled.publishedAt?.toISOString(),
      "2099-01-01T04:30:00.000Z",
    );
  } finally {
    await fixture.close();
  }
});
