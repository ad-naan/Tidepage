import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFile, readdir } from "node:fs/promises";
import { articlesTable } from "../../src/modules/content/infrastructure/schema";
import { postgresContentRepository } from "../../src/modules/content/infrastructure/postgres-repository";
import { demoContentRepository } from "../../src/modules/content/infrastructure/demo-repository";
import { seedArticles } from "../../src/modules/content/infrastructure/demo-repository";
import { createContentService } from "../../src/modules/content/application/service";
import type { Database } from "../../src/server/db/client";

test("demo and PostgreSQL adapters honor publication and summary boundaries", async () => {
  const pg = new PGlite();
  try {
    const migrations = new URL("../../drizzle/", import.meta.url);
    const files = (await readdir(migrations)).filter((name) => name.endsWith(".sql")).sort();
    for (const name of files) {
      await pg.exec(await readFile(new URL(name, migrations), "utf8"));
    }
    const db = drizzle(pg);
    const source = seedArticles[0];
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
      visibility: "published" as const,
      publishedAt: new Date("2020-01-01"),
      updatedAt: new Date("2020-01-02"),
    };
    await db
      .insert(articlesTable)
      .values([
        row,
        { ...row, slug: "draft-only", visibility: "draft", publishedAt: null },
        { ...row, slug: "scheduled-only", publishedAt: new Date("2099-01-01") },
      ]);
    // The query layer is shared PgDatabase code; this cast substitutes only its driver in tests.
    const repository = postgresContentRepository(db as unknown as Database);
    const service = createContentService(repository);
    const all = await service.allArticles();
    assert.equal(all.length, 1);
    assert.equal("sections" in all[0], false);
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
    const demo = createContentService(demoContentRepository);
    assert.equal("sections" in (await demo.allArticles())[0], false);
    assert.ok((await demo.articleBySlug(source.slug))?.sections.length);
  } finally {
    await pg.close();
  }
});
