import { test } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { createContentTestStore } from "../fixtures/content";
import { usersTable } from "../../src/modules/identity/infrastructure/schema";
import { commentsTable } from "../../src/modules/engagement/infrastructure/schema";
import { articlesTable } from "../../src/modules/content/infrastructure/schema";
import { articleFixtures } from "../fixtures/content";
import {
  discussionStore,
  requireDiscussionTarget,
} from "../../src/modules/engagement/server";
import { createDiscussionRoutes } from "../../src/modules/engagement/server/http";
import { unauthorizedError } from "../../src/server/http/errors";
import { getEnv } from "../../src/server/config/env";
import type { Database } from "../../src/server/db/client";

test("comments isolate content and locale, enforce reply ownership, and paginate exact timestamps", async () => {
  const fixture = await createContentTestStore();
  try {
    const [user] = await fixture.db
      .insert(usersTable)
      .values({ displayName: "Reader" })
      .returning();
    const store = discussionStore(fixture.db as unknown as Database);
    const target = { type: "note", id: "same" } as const;
    const root = await store.create(user.id, {
      target,
      locale: "zh-CN",
      body: "  A thought  ",
    });
    assert.equal(root.body, "A thought");
    for (const type of ["article", "project", "page"] as const)
      await store.create(user.id, {
        target: { type, id: "same" },
        locale: "zh-CN",
        body: type,
      });
    await store.create(user.id, { target, locale: "en", body: "English" });
    assert.equal(
      (await store.list({ ...target, locale: "zh-CN" })).items.length,
      1,
    );
    assert.equal(
      (await store.list({ ...target, locale: "en" })).items[0].body,
      "English",
    );
    const reply = await store.create(user.id, {
      target,
      locale: "zh-CN",
      parentId: root.id,
      body: "Reply",
    });
    assert.equal(reply.replyTo, "Reader");
    assert.equal(reply.parentId, root.id);
    await assert.rejects(
      store.create(user.id, {
        target: { type: "project", id: "same" },
        locale: "zh-CN",
        parentId: root.id,
        body: "Cross thread",
      }),
      /内容不存在/,
    );
    await assert.rejects(
      store.create(user.id, {
        target,
        locale: "en",
        parentId: root.id,
        body: "Cross locale",
      }),
      /内容不存在/,
    );
    await assert.rejects(
      store.create(user.id, { target, locale: "zh-CN", body: "   " }),
    );
    await assert.rejects(
      store.create(user.id, {
        target,
        locale: "zh-CN",
        body: "a".repeat(2001),
      }),
    );
    // The database itself rejects cross-thread references, even outside the API.
    await assert.rejects(
      fixture.db.insert(commentsTable).values({
        targetType: "article",
        targetId: "same",
        locale: "zh-CN",
        userId: user.id,
        parentId: root.id,
        body: "Invalid reference",
      }),
    );
    await fixture.db.insert(commentsTable).values(
      Array.from({ length: 27 }, (_, index) => ({
        targetType: "note" as const,
        targetId: "pagination",
        locale: "zh-CN" as const,
        userId: user.id,
        body: String(index),
      })),
    );
    await fixture.db.execute(
      sql`update comments set created_at = '2026-01-01 00:00:00.123456+00' where target_id = 'pagination'`,
    );
    const first = await store.list({
      type: "note",
      id: "pagination",
      locale: "zh-CN",
    });
    assert.equal(first.items.length, 20);
    assert.ok(first.next);
    const second = await store.list({
      type: "note",
      id: "pagination",
      locale: "zh-CN",
      after: first.next,
    });
    assert.equal(second.items.length, 7);
    assert.equal(second.next, null);
    assert.equal(
      new Set([...first.items, ...second.items].map((item) => item.id)).size,
      27,
    );
    await assert.rejects(
      store.list({
        type: "project",
        id: "pagination",
        locale: "zh-CN",
        after: first.next,
      }),
    );
  } finally {
    await fixture.close();
  }
});

test("comment routes require login, same origin and a published target; reject spoofed authors", async () => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  process.env.SITE_URL = "http://localhost:3000";
  process.env.INDEXING_ENABLED = "false";
  const fixture = await createContentTestStore();
  try {
    const [user] = await fixture.db
      .insert(usersTable)
      .values({ displayName: "Reader" })
      .returning();
    await fixture.db.insert(articlesTable).values({
      ...articleFixtures[0],
      visibility: "draft",
      publishedAt: null,
      updatedAt: new Date(articleFixtures[0].updatedAt),
    });
    const reads = {
      getArticle: fixture.service.articleBySlug,
      getNotes: fixture.service.notes,
      getProjects: fixture.service.projects,
    };
    const requireTarget = (
      target: Parameters<typeof requireDiscussionTarget>[0],
      locale: Parameters<typeof requireDiscussionTarget>[1],
    ) => requireDiscussionTarget(target, locale, reads);
    let signedIn = true;
    const routes = createDiscussionRoutes({
      store: () => discussionStore(fixture.db as unknown as Database),
      requireTarget,
      authorize: async () => {
        if (!signedIn) throw unauthorizedError();
        return { id: user.id, displayName: user.displayName, role: "reader" };
      },
    });
    const origin = new URL(getEnv().SITE_URL).origin;
    const context = { params: Promise.resolve({}) };
    const post = (body: unknown, from = origin) =>
      routes.create(
        new Request(`${origin}/api/v1/comments`, {
          method: "POST",
          headers: { origin: from, "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
        context,
      );
    const input = {
      target: { type: "page", id: "about" },
      locale: "zh-CN",
      body: "Hello",
    };
    assert.equal((await post(input, "https://other.example")).status, 403);
    signedIn = false;
    assert.equal((await post(input)).status, 401);
    signedIn = true;
    assert.equal(
      (await post({ ...input, author: "Impersonated" })).status,
      400,
    );
    assert.equal(
      (
        await post({
          ...input,
          target: { type: "article", id: articleFixtures[0].slug },
        })
      ).status,
      404,
    );
    assert.equal(
      (await post({ ...input, target: { type: "page", id: "not-a-page" } }))
        .status,
      404,
    );
    const posted = await post(input);
    assert.equal(posted.status, 201);
    assert.equal((await posted.json()).data.author, "Reader");
    const listed = await routes.list(
      new Request(`${origin}/api/v1/comments?type=page&id=about&locale=zh-CN`),
      context,
    );
    assert.equal(listed.status, 200);
    const result = (await listed.json()).data;
    assert.equal(result.items.length, 1);
    assert.equal("userId" in result.items[0], false);
  } finally {
    await fixture.close();
  }
});
