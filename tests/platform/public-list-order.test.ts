import assert from "node:assert/strict";
import { test } from "node:test";
import { createContentTestStore } from "../fixtures/content";
import type { Database } from "../../src/server/db/client";
import {
  articlesTable,
  notesTable,
  projectsTable,
  quotesTable,
  galleryPhotosTable,
} from "../../src/modules/content/infrastructure/schema";
import { friendsTable } from "../../src/modules/friends/infrastructure/schema";
import { listGalleryPhotos } from "../../src/modules/content/server/gallery";
import { listPublicFriends } from "../../src/modules/friends/server";
import {
  readPublicListOrder,
  savePublicListOrder,
} from "../../src/server/workbench/public-list-order";

test("public order is shared by all six lists, article pagination, and reading navigation", async (t) => {
  const fixture = await createContentTestStore();
  t.after(() => fixture.close());
  const { repository } = fixture;
  const db = fixture.db as unknown as Database;
  const locale = "zh-CN" as const;
  const [first, second] = ["coast-morning", "coast-evening"];
  const items = [first, second];
  const publication = (index: number) =>
    ({
      locale,
      visibility: "published" as const,
      publishedAt: new Date(`2021-01-0${2 - index}T00:00:00Z`),
    }) as const;
  const article = (slug: string, index: number) => ({
    ...publication(index),
    slug,
    title: slug,
    excerpt: "",
    minutes: 1,
    category: "life" as const,
  });
  await fixture.db.insert(articlesTable).values([
    ...items.map(article),
    ...items.map((id, index) => ({
      ...article(id, index),
      locale: "en" as const,
    })),
    { ...article("draft-article", 0), visibility: "draft" },
    {
      ...article("scheduled-article", 0),
      publishedAt: new Date("2099-01-01T00:00:00Z"),
    },
  ]);
  await fixture.db.insert(notesTable).values(
    items.map((id, index) => ({
      ...publication(index),
      id,
      publishedOn: `2021-01-0${2 - index}`,
      mood: "Quiet",
      text: id,
      tag: "",
      sketch: "boat" as const,
    })),
  );
  await fixture.db.insert(projectsTable).values(
    items.map((id, index) => ({
      ...publication(index),
      id,
      name: id,
      subtitle: "",
      description: "",
      category: "web",
      status: "",
      sketch: "boat" as const,
      color: "sand",
      sortOrder: index,
    })),
  );
  await fixture.db.insert(quotesTable).values(
    items.map((id, index) => ({
      ...publication(index),
      id,
      text: id,
      author: "",
      sortOrder: index,
    })),
  );
  const ownerId = "7f0e890f-10ba-4413-9f34-d178a6090c52";
  await fixture.db.insert(galleryPhotosTable).values(
    items.map((id, index) => ({
      id,
      ownerId,
      locale,
      assetId: `/uploads/${"a".repeat(64)}.png`,
      title: id,
      caption: "",
      alt: id,
      place: "",
      category: "nature" as const,
      width: 640,
      height: 480,
      sortOrder: index,
      publishedOn: "2021-01-01",
    })),
  );
  await fixture.db.insert(friendsTable).values(
    items.map((id, index) => ({
      id,
      ownerId,
      locale,
      name: id,
      description: "",
      url: `https://${id}.example`,
      category: "life" as const,
      sortOrder: index,
    })),
  );

  const readers = {
    articles: async () =>
      (await repository.allArticles(locale)).map(({ slug }) => slug),
    notes: async () => (await repository.listNotes(locale)).map(({ id }) => id),
    projects: async () =>
      (await repository.projects(locale)).map(({ id }) => id),
    quotes: async () => (await repository.quotes(locale)).map(({ id }) => id),
    gallery: async () =>
      (await listGalleryPhotos(locale, db)).map(({ id }) => id),
    friends: async () =>
      (await listPublicFriends(locale, db)).map(({ id }) => id),
  };
  for (const kind of [
    "articles",
    "notes",
    "projects",
    "quotes",
    "gallery",
    "friends",
  ] as const) {
    const initial = await readPublicListOrder(kind, locale, db);
    assert.equal(initial.revision, 0);
    assert.deepEqual(
      initial.items.map(({ id }) => id),
      items,
    );
    assert.deepEqual(await readers[kind](), items);
    await savePublicListOrder(
      { kind, locale, revision: initial.revision, ids: [second, first] },
      db,
    );
    assert.deepEqual(await readers[kind](), [second, first]);
    assert.equal((await readPublicListOrder(kind, locale, db)).revision, 1);
  }
  assert.equal((await repository.latestNote(locale))?.text, second);
  assert.equal((await repository.projectPreviews(locale))[0].id, second);
  assert.equal((await repository.firstQuote(locale))?.text, second);
  assert.equal((await repository.nextArticle(second, locale))?.slug, first);
  assert.deepEqual(
    (await repository.allArticles("en")).map(({ slug }) => slug),
    items,
  );
  for (const [page, slug] of [
    [1, second],
    [2, first],
  ] as const) {
    const result = await repository.listArticles({
      locale,
      q: "coast",
      category: "life",
      page,
      pageSize: 1,
    });
    assert.equal(result.total, 2);
    assert.deepEqual(
      result.items.map((item) => item.slug),
      [slug],
    );
  }
  const order = { kind: "articles", locale, ids: items };
  await assert.rejects(savePublicListOrder({ ...order, revision: 0 }, db), {
    status: 409,
  });
  await assert.rejects(
    savePublicListOrder(
      { ...order, revision: 1, ids: [first, "draft-article"] },
      db,
    ),
    { status: 409 },
  );
  await fixture.db.insert(articlesTable).values({
    ...article("new-article", 0),
    publishedAt: new Date("2024-01-01T00:00:00Z"),
  });
  assert.deepEqual(await readers.articles(), [second, first, "new-article"]);
});
