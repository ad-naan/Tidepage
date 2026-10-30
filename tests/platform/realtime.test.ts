import { test } from "node:test";
import assert from "node:assert/strict";
import { closePubSub, getPubSub } from "../../src/server/realtime/pubsub";
import {
  checkRateLimit,
  clientKey,
  enforceRateLimit,
} from "../../src/server/http/rate-limit";
import {
  conflictError,
  tooManyRequestsError,
  unauthorizedError,
} from "../../src/server/http/errors";

test("local pubsub delivers messages per channel and supports unsubscribe", async () => {
  await closePubSub();
  const bus = await getPubSub();
  const received: string[] = [];
  const other: string[] = [];
  const unsubscribe = await bus.subscribe("world:chat", (message) =>
    received.push(message),
  );
  await bus.subscribe("world:other", (message) => other.push(message));
  await bus.publish("world:chat", "hello");
  await unsubscribe();
  await bus.publish("world:chat", "after-unsubscribe");
  assert.deepEqual(received, ["hello"]);
  assert.deepEqual(other, []);
  await closePubSub();
});

test("fixed-window rate limiter blocks over-limit calls and resets", async () => {
  const key = `test:${Date.now()}`;
  const first = checkRateLimit(key, 2, 60);
  assert.equal(first.allowed, true);
  const second = checkRateLimit(key, 2, 60);
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);
  const third = checkRateLimit(key, 2, 60);
  assert.equal(third.allowed, false);
  assert.ok(third.retryAfterSeconds >= 1);
});

test("enforceRateLimit throws a localized RATE_LIMITED AppError", async () => {
  const request = new Request("https://example.test/api/v1/notes", {
    headers: { "x-forwarded-for": "203.0.113.7" },
  });
  assert.equal(clientKey(request), "203.0.113.7");
  const scope = `test-route:${Date.now()}`;
  await enforceRateLimit(request, scope, 1, 60);
  await assert.rejects(enforceRateLimit(request, scope, 1, 60), {
    code: "RATE_LIMITED",
    status: 429,
  });
});

test("error factories carry stable codes for the API error pipeline", () => {
  assert.equal(unauthorizedError().status, 401);
  assert.equal(unauthorizedError().code, "UNAUTHORIZED");
  assert.equal(conflictError().code, "CONFLICT");
  assert.equal(conflictError().status, 409);
  const limited = tooManyRequestsError(30);
  assert.equal(limited.status, 429);
  assert.deepEqual(limited.details, { retryAfterSeconds: 30 });
});
