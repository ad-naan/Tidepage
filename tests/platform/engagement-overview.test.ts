import assert from "node:assert/strict";
import { test } from "node:test";
import { articlesTable } from "../../src/modules/content/infrastructure/schema";
import {
  commentsTable,
  interactionsTable,
} from "../../src/modules/engagement/infrastructure/schema";
import { getEngagementOverview } from "../../src/modules/engagement/server/overview";
import { usersTable } from "../../src/modules/identity/infrastructure/schema";
import { getReaderDirectory } from "../../src/modules/identity/server/readers";
import type { Database } from "../../src/server/db/client";
import { timePresentation } from "../../src/shared/lib/date-time";
import { createContentTestStore } from "../fixtures/content";

test("engagement overview attributes comments and likes while keeping saves anonymous", async () => {
  const fixture = await createContentTestStore();
  try {
    const [author, visitor] = await fixture.db
      .insert(usersTable)
      .values([
        { displayName: "Author", role: "author" },
        { displayName: "Visitor", email: "visitor@example.test" },
      ])
      .returning();
    const article = {
      slug: "shared-slug",
      excerpt: "",
      category: "life",
      minutes: 1,
      visibility: "published",
      publishedAt: new Date("2020-01-01"),
    } as const;
    await fixture.db.insert(articlesTable).values([
      { ...article, locale: "en", title: "Mine", sourceOwner: author.id },
      { ...article, locale: "zh-CN", title: "Other", sourceOwner: visitor.id },
      {
        ...article,
        slug: "draft",
        title: "Draft",
        visibility: "draft",
        sourceOwner: author.id,
      },
    ]);
    const comment = {
      userId: visitor.id,
      targetType: "article",
      targetId: article.slug,
      locale: "en",
      body: "A thoughtful comment",
    } as const;
    await fixture.db
      .insert(commentsTable)
      .values([
        comment,
        { ...comment, locale: "zh-CN" },
        { ...comment, targetType: "page", targetId: "about" },
        { ...comment, targetId: "draft", locale: "zh-CN" },
      ]);
    await fixture.db.insert(interactionsTable).values([
      { ...comment, kind: "save" },
      { ...comment, kind: "like", createdAt: new Date("2021-01-01") },
    ]);

    const db = fixture.db as unknown as Database;
    const mine = await getEngagementOverview({ ...author, role: "author" }, db);
    assert.deepEqual(mine?.counts, {
      comment: { total: 1, recent: 1 },
      like: { total: 1, recent: 0 },
      save: { total: 1, recent: 1 },
    });
    assert.deepEqual(
      mine?.activity.map(({ kind }) => kind),
      ["save", "comment", "like"],
    );
    assert.deepEqual(
      mine?.activity.map(({ author, body, title, readerId }) => [
        author,
        body,
        title,
        readerId,
      ]),
      [
        [null, null, "Mine", null],
        ["Visitor", comment.body, "Mine", null],
        ["Visitor", null, "Mine", null],
      ],
    );
    assert.ok(
      mine && timePresentation(mine.activity[0].createdAt, "en", "activity"),
    );

    const site = await getEngagementOverview({ ...author, role: "admin" }, db);
    assert.equal(site?.counts.comment?.total, 3);
    assert.ok(site?.activity.some(({ type }) => type === "page"));
    assert.equal(site?.days.length, 7);
    assert.equal(
      site?.days.reduce((sum, { counts }) => sum + (counts.comment ?? 0), 0),
      3,
    );
    assert.equal(
      site?.activity.find(({ kind }) => kind === "like")?.readerId,
      visitor.id,
    );
    assert.equal(
      site?.activity.find(({ kind }) => kind === "save")?.readerId,
      null,
    );
    const reader = await getEngagementOverview(
      { ...author, role: "admin" },
      db,
      visitor.id,
    );
    assert.equal(reader?.counts.comment?.total, 3);
    assert.equal(reader?.counts.like?.total, 1);
    assert.equal(reader?.counts.save, undefined);
    const admin = { ...author, role: "admin" } as const;
    const directory = await getReaderDirectory(
      admin,
      { query: "VISITOR@", page: 1, readerId: author.id },
      db,
    );
    assert.deepEqual(
      directory?.accounts.map(({ id }) => id),
      [visitor.id],
    );
    assert.equal(directory?.selected, null);
    assert.equal(
      (await getReaderDirectory(admin, { query: "%", page: 1 }, db))?.total,
      0,
    );
    assert.equal(
      await getReaderDirectory(author, { query: "", page: 1 }, db),
      null,
    );
    assert.equal(
      await getEngagementOverview(
        { ...author, role: "author" },
        db,
        visitor.id,
      ),
      null,
    );
    assert.equal(
      await getEngagementOverview({ ...author, role: "reader" }, db),
      null,
    );
  } finally {
    await fixture.close();
  }
});
