import assert from "node:assert/strict";
import { test } from "node:test";
import { eq } from "drizzle-orm";
import { createContentTestStore } from "../fixtures/content";
import {
  acquireModelSlot,
  requestModel,
} from "../../src/modules/ai/server/provider";
import { reserveModelUsage } from "../../src/modules/ai/server/usage";
import { aiUsageTable } from "../../src/server/db/ai-usage-schema";
import type { Database } from "../../src/server/db/client";

test("model quotas share durable counters, isolate audiences and stop provider calls before spending", async (t) => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
  process.env.AI_CHAT_COMPLETIONS_URL =
    "http://127.0.0.1:9000/v1/chat/completions";
  process.env.AI_MODEL = "test";
  process.env.AI_HARBOR_DAILY_UNITS = "1050";
  const fixture = await createContentTestStore();
  t.after(() => fixture.close());
  const db = fixture.db as unknown as Database;
  const harbor = { audience: "harbor", db, accountId: "first" } as const;
  const other = { ...harbor, accountId: "second" };
  const editorial = { ...harbor, audience: "editorial" } as const;
  const results = await Promise.allSettled(
    Array.from({ length: 25 }, () => reserveModelUsage(harbor, 1)),
  );
  assert.equal(
    results.filter(({ status }) => status === "fulfilled").length,
    24,
  );
  assert.ok(
    results.some(
      (item) => item.status === "rejected" && item.reason.status === 429,
    ),
  );
  assert.deepEqual(
    (await db.select().from(aiUsageTable))
      .map(({ subject, used }) => [subject, used])
      .sort(),
    [
      ["", 24],
      ["first", 24],
    ],
  );

  const model = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("Unavailable", { status: 502 }),
  );
  const input = {
    messages: [{ role: "user", content: "海湾" }],
    stream: false,
    max_completion_tokens: 700,
  };
  const signal = new AbortController().signal;
  const send = (
    access: typeof harbor | typeof other | typeof editorial,
    requestSignal = signal,
  ) => requestModel(access, input, requestSignal, "application/json");
  await assert.rejects(send(other, AbortSignal.abort()), {
    name: "AbortError",
  });
  await assert.rejects(send(other), /Model provider request failed/);
  await assert.rejects(send({ ...other, accountId: "third" }), { status: 429 });
  assert.equal(model.mock.callCount(), 1);
  const charged =
    24 +
    Buffer.byteLength(JSON.stringify({ ...input, model: "test" }), "utf8") +
    700;
  assert.deepEqual(
    (await db.select().from(aiUsageTable))
      .map(({ subject, used }) => [subject, used])
      .sort(),
    [
      ["", charged],
      ["first", 24],
      ["second", 1],
    ],
  );
  await assert.rejects(send(editorial), /Model provider request failed/);
  assert.equal(model.mock.callCount(), 2);

  await db
    .update(aiUsageTable)
    .set({ day: "2000-01-01" })
    .where(eq(aiUsageTable.scope, "harbor"));
  await reserveModelUsage(harbor, 1);
  assert.equal(
    (
      await db
        .select()
        .from(aiUsageTable)
        .where(eq(aiUsageTable.scope, "harbor"))
    ).find((row) => row.subject === "first")?.used,
    1,
  );

  const unavailable = {
    ...other,
    db: {
      transaction: async () => {
        throw new Error("DB down");
      },
    } as unknown as Database,
  };
  await assert.rejects(send(unavailable), { status: 503 });
  assert.equal(model.mock.callCount(), 2);
});

test("harbor requests cannot consume all local provider slots or overlap under one account", () => {
  const harbor = { audience: "harbor", accountId: "first" } as const;
  const release = acquireModelSlot(harbor);
  try {
    assert.throws(() => acquireModelSlot(harbor), { status: 429 });
    const releaseSecond = acquireModelSlot({ ...harbor, accountId: "second" });
    try {
      assert.throws(() => acquireModelSlot({ ...harbor, accountId: "third" }), {
        status: 429,
      });
      acquireModelSlot({ audience: "editorial", accountId: "owner" })();
    } finally {
      releaseSecond();
    }
  } finally {
    release();
  }
  acquireModelSlot(harbor)();
});
