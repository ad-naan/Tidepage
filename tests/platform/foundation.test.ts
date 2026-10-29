import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { parseEnv } from "../../src/server/config/env-schema";
import { createRemember } from "../../src/server/cache/remember";
import type { CacheStore } from "../../src/server/cache/store";
import { defineRoute } from "../../src/server/http/route";
import { serializeJsonLd } from "../../src/server/seo/structured-data";
import { articleQuerySchema } from "../../src/modules/content/domain/query";

test("configuration validates booleans, service URLs and production indexing", () => {
  assert.equal(parseEnv({}).CONTENT_SOURCE, "demo");
  assert.equal(parseEnv({ INDEXING_ENABLED: "false" }).INDEXING_ENABLED, false);
  assert.throws(() => parseEnv({ CONTENT_SOURCE: "postgres" }), /DATABASE_URL/);
  assert.throws(
    () => parseEnv({ DATABASE_URL: "https://example.test" }),
    /PostgreSQL/,
  );
  assert.throws(
    () => parseEnv({ SITE_URL: "https://example.test/blog" }),
    /SITE_URL/,
  );
  assert.throws(
    () => parseEnv({ INDEXING_ENABLED: "true" }),
    /INDEXING_ENABLED/,
  );
});
test("pagination and search have strict, bounded inputs", () => {
  assert.equal(articleQuerySchema.parse({}).pageSize, 12);
  for (const value of [
    { page: 0 },
    { pageSize: 51 },
    { pageSize: "abc" },
    { category: "invalid" },
    { q: "x".repeat(101) },
    { sort: "injection" },
  ])
    assert.equal(articleQuerySchema.safeParse(value).success, false);
});
test("cache failures never disguise source errors; corrupt values are reloaded", async () => {
  const failing: CacheStore = {
    get: async () => {
      throw Error("offline");
    },
    set: async () => {
      throw Error("offline");
    },
    delete: async () => {},
  };
  const remember = createRemember(failing);
  assert.equal(await remember("a", 10, z.number(), async () => 42), 42);
  await assert.rejects(
    remember("b", 10, z.number(), async () => {
      throw Error("database unavailable");
    }),
    /database unavailable/,
  );
  const corrupt: CacheStore = {
    get: async () => '{"wrong":true}',
    set: async () => {},
    delete: async () => {},
  };
  assert.equal(
    await createRemember(corrupt)("a", 10, z.number(), async () => 7),
    7,
  );
});
test("concurrent cache misses share one database read", async () => {
  let calls = 0;
  let release!: (n: number) => void;
  const pending = new Promise<number>((resolve) => {
    release = resolve;
  });
  const store: CacheStore = {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
  };
  const remember = createRemember(store);
  const load = () => {
    calls++;
    return pending;
  };
  const first = remember("same", 10, z.number(), load),
    second = remember("same", 10, z.number(), load);
  release(4);
  assert.deepEqual(await Promise.all([first, second]), [4, 4]);
  assert.equal(calls, 1);
});
test("unexpected HTTP failures hide internal details and carry a request id", async () => {
  const handler = defineRoute(async () => {
    throw Error("postgres://secret-password@host/database");
  });
  const response = await handler(new Request("http://localhost/api/v1/test"), {
    params: Promise.resolve({}),
  });
  const body = await response.json();
  assert.equal(response.status, 500);
  assert.equal(body.error.code, "INTERNAL_ERROR");
  assert.equal(JSON.stringify(body).includes("secret-password"), false);
  assert.equal(body.meta.requestId, response.headers.get("x-request-id"));
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("structured data cannot terminate its script element", () => {
  const original = { headline: "</script><script>alert(1)</script>\u2028" };
  const encoded = serializeJsonLd(original);
  assert.equal(encoded.includes("</script>"), false);
  assert.deepEqual(JSON.parse(encoded), original);
});
