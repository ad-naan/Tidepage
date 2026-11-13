import assert from "node:assert/strict";
import { test } from "node:test";
import { sql } from "drizzle-orm";
import { createContentTestStore } from "../fixtures/content";
import {
  articlesTable,
  notesTable,
} from "../../src/modules/content/infrastructure/schema";
import {
  normalizeTags,
  parseTags,
  tagKey,
  taggedUrl,
  tagQuerySchema,
} from "../../src/modules/content/domain/tags";
import {
  queryContentTags,
  tagKeySql,
} from "../../src/modules/content/infrastructure/tags";
import type { Database } from "../../src/server/db/client";

test("tag identities preserve display spelling and normalize full-width, hashes, whitespace and case", () => {
  assert.deepEqual(
    parseTags(" #GitHub，github, ＧｉｔＨｕｂ, , #生活,生活, C#, C++"),
    ["GitHub", "生活", "C#", "C++"],
  );
  assert.equal(tagKey(" ＃  Web\t Design  "), "web design");
  assert.deepEqual(normalizeTags(["#", " ", "AI", "ai"]), ["AI"]);
  assert.equal(
    new URL(
      taggedUrl("articles", "C++"),
      "https://example.com",
    ).searchParams.get("tag"),
    "c++",
  );
  assert.equal(tagQuerySchema.safeParse({ limit: 1000 }).success, false);
});

test("published tag search, counts and exact filters agree across legacy articles and notes", async (t) => {
  const store = await createContentTestStore();
  t.after(() => store.close());
  const db = store.db as unknown as Database;
  const publication = {
    locale: "zh-CN" as const,
    visibility: "published" as const,
    publishedAt: new Date("2020-01-01"),
  };
  const article = {
    ...publication,
    title: "Article",
    excerpt: "",
    category: "technology" as const,
    minutes: 1,
    sketch: "boat" as const,
    sections: [],
  };
  await store.db.insert(articlesTable).values([
    {
      ...article,
      slug: "first",
      tags: ["#GitHub", "github", " ＧｉｔＨｕｂ ", "C++", "100%", ""],
    },
    {
      ...article,
      slug: "second",
      category: "life",
      tags: ["GitHub", "GitHub Actions"],
    },
    { ...article, slug: "draft", visibility: "draft", tags: ["Secret"] },
    {
      ...article,
      slug: "scheduled",
      publishedAt: new Date("2099-01-01"),
      tags: ["Future"],
    },
    { ...article, slug: "english", locale: "en", tags: ["English"] },
  ]);
  const note = {
    ...publication,
    publishedOn: "2020-01-01",
    text: "Note",
    mood: "",
    sketch: "tree" as const,
  };
  await store.db.insert(notesTable).values([
    { ...note, id: "one", tag: "＃GitHub" },
    { ...note, id: "two", tag: "GitHub Actions" },
    { ...note, id: "draft", tag: "Secret", visibility: "draft" },
    {
      ...note,
      id: "scheduled",
      tag: "Future",
      publishedAt: new Date("2099-01-01"),
    },
    { ...note, id: "english", locale: "en", tag: "English" },
  ]);
  const query = tagQuerySchema.parse({ q: "ＧｉｔＨｕｂ" });
  assert.deepEqual(
    (await queryContentTags(query, db)).map(({ key, count }) => ({
      key,
      count,
    })),
    [
      { key: "github", count: 3 },
      { key: "github actions", count: 2 },
    ],
  );
  const articleTags = await queryContentTags(
    { ...query, kind: "articles" },
    db,
  );
  assert.equal(articleTags[0].count, 2);
  assert.equal(
    (await queryContentTags({ ...query, kind: "notes" }, db))[0].count,
    1,
  );
  assert.equal(
    (await queryContentTags({ ...query, q: "%" }, db))[0].key,
    "100%",
  );
  assert.equal(
    (await queryContentTags({ ...query, q: "' OR 1=1 --" }, db)).length,
    0,
  );
  assert.equal(
    (await queryContentTags({ ...query, q: "", limit: 1 }, db)).length,
    1,
  );
  assert.equal(
    (await queryContentTags({ ...query, locale: "en", q: "" }, db))[0].key,
    "english",
  );
  assert.equal((await store.service.listArticles({ tag: "#GITHUB" })).total, 2);
  assert.equal(
    (await store.service.listArticles({ tag: "github", category: "life" }))
      .total,
    1,
  );
  assert.equal(
    (await store.service.listArticles({ tag: "github", q: "missing" })).total,
    0,
  );
  const page = await store.service.listArticles({
    tag: "github",
    page: 2,
    pageSize: 1,
  });
  assert.equal(page.total, 2);
  assert.equal(page.items.length, 1);
  assert.equal(
    (await store.repository.listNotes("zh-CN", undefined, "#GITHUB")).length,
    1,
  );
  assert.equal(
    (await store.repository.listNotes("zh-CN", undefined, "github actions"))[0]
      .id,
    "two",
  );
  for (const value of [
    " ＃  Web\t Design  ",
    "C#",
    " ＧｉｔＨｕｂ ",
    "#",
    "\u00a0AI\u00a0",
  ]) {
    const result = await db.execute(
      sql`select ${tagKeySql(sql`${value}`)} as key`,
    );
    assert.equal(result.rows[0].key, tagKey(value));
  }
});
