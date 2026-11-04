import { test } from "node:test";
import assert from "node:assert/strict";
import { createContentTestStore } from "../fixtures/content";
import { usersTable } from "../../src/modules/identity/infrastructure/schema";
import { interactionStore } from "../../src/modules/engagement/server/interactions";
import { createInteractionRoutes } from "../../src/modules/engagement/server/interaction-http";
import { unauthorizedError, notFoundError } from "../../src/server/http/errors";
import type { Database } from "../../src/server/db/client";

test("backend likes and saves are idempotent, account-specific, and isolated by content and locale", async () => {
  const fixture = await createContentTestStore();
  try {
    const [first, second] = await fixture.db
      .insert(usersTable)
      .values([{ displayName: "First" }, { displayName: "Second" }])
      .returning();
    const db = fixture.db as unknown as Database;
    const store = interactionStore(db);
    const input = {
      target: { type: "note", id: "same" },
      locale: "zh-CN",
      kind: "like",
      active: true,
    };
    const query = { type: "note", ids: ["same"], locale: "zh-CN" };
    assert.equal((await store.set(first.id, input)).likeCount, 1);
    assert.equal((await store.set(first.id, input)).likeCount, 1);
    assert.equal((await store.set(second.id, input)).likeCount, 2);
    await store.set(first.id, { ...input, kind: "save" });
    assert.equal(
      (await interactionStore(db).read(query, first.id))[0].saved,
      true,
    );
    assert.equal((await store.read(query, second.id))[0].saved, false);
    assert.deepEqual((await store.read(query, null))[0], {
      target: input.target,
      likeCount: 2,
      liked: false,
      saved: false,
    });
    for (const type of ["article", "project", "page"] as const) {
      assert.equal(
        (await store.read({ ...query, type }, first.id))[0].likeCount,
        0,
      );
      await store.set(first.id, { ...input, target: { type, id: "same" } });
    }
    assert.equal(
      (await store.read({ ...query, locale: "en" }, first.id))[0].likeCount,
      0,
    );
    await store.set(first.id, { ...input, active: false });
    const state = await store.set(first.id, { ...input, active: false });
    assert.equal(state.likeCount, 1);
    assert.equal(state.liked, false);
    assert.equal(state.saved, true);
    assert.equal((await store.read(query, second.id))[0].liked, true);
    await store.set(first.id, { ...input, kind: "save", active: false });
    assert.equal((await store.read(query, first.id))[0].saved, false);
    const many = await store.read(
      { ...query, ids: ["same", "empty", "same"] },
      first.id,
    );
    assert.equal(many.length, 2);
    assert.equal(many[1].likeCount, 0);
    assert.equal("userId" in many[0], false);
  } finally {
    await fixture.close();
  }
});

test("interaction routes allow anonymous counts, require authenticated same-origin writes, and reject spoofing", async () => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  process.env.SITE_URL = "http://localhost:3000";
  process.env.INDEXING_ENABLED = "false";
  const fixture = await createContentTestStore();
  try {
    const [user] = await fixture.db
      .insert(usersTable)
      .values({ displayName: "Reader" })
      .returning();
    let signedIn = false;
    const principal = {
      id: user.id,
      displayName: user.displayName,
      role: "reader" as const,
    };
    const routes = createInteractionRoutes({
      store: () => interactionStore(fixture.db as unknown as Database),
      currentUser: async () => (signedIn ? principal : null),
      authorize: async () => {
        if (!signedIn) throw unauthorizedError();
        return principal;
      },
      requireTarget: async (target) => {
        if (target.id !== "about") throw notFoundError();
      },
      requireTargets: async (_type, ids) => {
        if (ids.some((id) => id !== "about")) throw notFoundError();
      },
    });
    const context = { params: Promise.resolve({}) };
    const input = {
      target: { type: "page", id: "about" },
      locale: "zh-CN",
      kind: "save",
      active: true,
    };
    const put = (body: unknown, origin = "http://localhost:3000") =>
      routes.set(
        new Request("http://localhost:3000/api/v1/interactions", {
          method: "PUT",
          headers: { origin, "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
        context,
      );
    assert.equal((await put(input)).status, 401);
    signedIn = true;
    assert.equal((await put(input, "https://other.example")).status, 403);
    assert.equal((await put({ ...input, userId: user.id })).status, 400);
    assert.equal(
      (await put({ ...input, target: { type: "note", id: "unpublished" } }))
        .status,
      404,
    );
    assert.equal((await put(input)).status, 200);
    const url =
      "http://localhost:3000/api/v1/interactions?type=page&id=about&locale=zh-CN";
    assert.equal(
      (await (await routes.read(new Request(url), context)).json()).data[0]
        .saved,
      true,
    );
    signedIn = false;
    const publicResponse = await routes.read(new Request(url), context);
    assert.equal(publicResponse.headers.get("cache-control"), "no-store");
    assert.equal((await publicResponse.json()).data[0].saved, false);
    assert.equal(
      (
        await routes.read(
          new Request(
            "http://localhost:3000/api/v1/interactions?type=page&locale=zh-CN",
          ),
          context,
        )
      ).status,
      400,
    );
  } finally {
    await fixture.close();
  }
});
