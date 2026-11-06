import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  issueCoastIdentity,
  readCoastIdentity,
  issueCoastReceipt,
  readCoastReceipt,
  coastDay,
} from "../../src/server/realtime/coast-tokens";
import {
  emptyCoastRoom,
  joinCoastRoom,
  advanceCoastRoom,
  coastRoomSnapshot,
  applyCoastInput,
  leaveCoastRoom,
} from "../../src/modules/world/domain/coast-room";
import {
  inviteCoastPhoto,
  respondCoastPhoto,
} from "../../src/modules/world/domain/coast-photo";
import { defaultAvatar } from "../../src/modules/world/domain/coast-avatar";
import { createContentTestStore } from "../fixtures/content";
import { usersTable } from "../../src/modules/identity/infrastructure/schema";
import { coastMemoryStore } from "../../src/modules/world/server/memories";
import { createCoastRoutes } from "../../src/modules/world/server/http";
import type { Database } from "../../src/server/db/client";
import type { Principal } from "../../src/modules/identity/domain/principal";
import { unauthorizedError } from "../../src/server/http/errors";

const secret = "coast-memories-test-key-with-at-least-32-characters";
const now = Date.parse("2026-11-06T16:01:00Z");
const evidence = (subject: string = randomUUID()) => ({
  subject,
  source: "visit:2026-11-07:beach",
  kind: "visit" as const,
  place: "beach" as const,
  withHost: false,
  companionCount: 1,
  occurredAt: now,
});

test("coastal proofs reject tampering, key substitution, purpose confusion and expiry; day follows UTC+8", () => {
  const identity = issueCoastIdentity(
    { subject: randomUUID(), name: "Host", host: true },
    secret,
    now,
  );
  const receipt = issueCoastReceipt(evidence(), secret, now);
  assert.equal(readCoastIdentity(identity, secret, now)?.host, true);
  assert.equal(readCoastReceipt(receipt, secret, now)?.day, "2026-11-07");
  assert.equal(coastDay(now - 120_000), "2026-11-06");
  assert.equal(readCoastIdentity(receipt, secret, now), null);
  assert.equal(readCoastReceipt(identity, secret, now), null);
  for (const raw of [
    identity + "x",
    identity.replace(/^./, identity[0] === "A" ? "B" : "A"),
    "{}",
    "x".repeat(4097),
  ])
    assert.equal(readCoastIdentity(raw, secret, now), null);
  assert.equal(
    readCoastIdentity(
      identity,
      "different-signing-key-at-least-32-characters",
      now,
    ),
    null,
  );
  assert.equal(readCoastIdentity(identity, secret, now + 180_000), null);
  assert.equal(readCoastIdentity(identity, secret, now - 11_000), null);
  assert.equal(readCoastReceipt(receipt, secret, now + 300_000), null);
});

function photoFixture() {
  const room = emptyCoastRoom(now);
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  ids.forEach((id) => joinCoastRoom(room, id, id, id, defaultAvatar, now));
  return { room, ids, photoId: randomUUID() };
}
test("photo invitations are private, require recipient consent and freeze the same composition for both participants", () => {
  const {
    room,
    ids: [a, b, c],
    photoId,
  } = photoFixture();
  const original = structuredClone(room.sessions[b].player);
  assert.deepEqual(inviteCoastPhoto(room, a, b, photoId, now), { ok: true });
  assert.equal(coastRoomSnapshot(room, now, c).photo, null);
  assert.equal(coastRoomSnapshot(room, now).photo, null);
  assert.equal(coastRoomSnapshot(room, now, b).photo?.state, "pending");
  assert.deepEqual(room.sessions[b].player, original);
  assert.equal(respondCoastPhoto(room, a, photoId, "accept", now).ok, false);
  assert.equal(respondCoastPhoto(room, c, photoId, "cancel", now).ok, false);
  assert.deepEqual(respondCoastPhoto(room, b, photoId, "accept", now), {
    ok: true,
  });
  assert.equal(room.sessions[b].player.z, 3.2);
  applyCoastInput(
    room,
    a,
    a,
    { sequence: 1, direction: { x: 1, z: 0 }, action: "idle" },
    now + 100,
  );
  advanceCoastRoom(room, now + 4001);
  const first = coastRoomSnapshot(room, now + 4001, a).photo!;
  assert.equal(first.state, "complete");
  assert.equal(first.composition!.players[0].x, -5.1);
  assert.deepEqual(first, coastRoomSnapshot(room, now + 4001, b).photo);
  room.sessions[a].player.appearance = { ...defaultAvatar, coat: "coral" };
  assert.equal(first.composition!.players[0].appearance.coat, "sea");
});
test("declining, expiry and disconnect cancel a photo; anonymous resume cannot inherit the host badge", () => {
  for (const exit of ["decline", "expire", "leave"] as const) {
    const {
      room,
      ids: [a, b],
      photoId,
    } = photoFixture();
    inviteCoastPhoto(room, a, b, photoId, now);
    if (exit === "decline") respondCoastPhoto(room, b, photoId, "decline", now);
    else if (exit === "leave") leaveCoastRoom(room, b, b);
    else advanceCoastRoom(room, now + 30_001);
    assert.equal(
      room.photos![photoId].state,
      exit === "decline" ? "declined" : "cancelled",
    );
    assert.equal(room.photos![photoId].composition, null);
  }
  const room = emptyCoastRoom(now),
    id = randomUUID();
  joinCoastRoom(
    room,
    "owner",
    "hash",
    id,
    defaultAvatar,
    now,
    readCoastIdentity(
      issueCoastIdentity(
        { subject: randomUUID(), name: "Host", host: true },
        secret,
        now,
      ),
      secret,
      now,
    ),
  );
  assert.equal(room.sessions[id].player.host, true);
  advanceCoastRoom(room, now + 180_001);
  assert.equal(room.sessions[id].player.host, false);
  joinCoastRoom(
    room,
    "new",
    "hash",
    randomUUID(),
    defaultAvatar,
    now + 180_002,
  );
  assert.equal(room.sessions[id].identity, null);
});

test("coastal journal routes enforce account ownership, same-origin, verified host policy and durable idempotent records", async () => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  process.env.SITE_URL = "http://localhost:3000";
  process.env.INDEXING_ENABLED = "false";
  const fixture = await createContentTestStore();
  try {
    const [owner, other] = await fixture.db
      .insert(usersTable)
      .values([
        { displayName: "Host", role: "admin" },
        { displayName: "Reader" },
      ])
      .returning();
    const db = fixture.db as unknown as Database;
    let principal: Principal | null = null;
    let hostId = owner.id;
    const routes = createCoastRoutes({
      authorize: async () => {
        if (!principal) throw unauthorizedError();
        return principal;
      },
      policy: () => ({ secret, hostId }),
      store: () => coastMemoryStore(db),
      clock: () => now,
    });
    const context = { params: Promise.resolve({}) };
    const request = (
      path: string,
      body?: unknown,
      origin = "http://localhost:3000",
    ) =>
      new Request(`http://localhost:3000/api/v1/world/${path}`, {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    const save = (body: unknown, origin?: string) =>
      routes.save(request("memories", body, origin), context);
    const list = (after?: string) =>
      routes.list(
        new Request(
          `http://localhost:3000/api/v1/world/memories${after ? `?after=${after}` : ""}`,
        ),
        context,
      );
    assert.equal((await list()).status, 401);
    principal = { id: owner.id, displayName: owner.displayName, role: "admin" };
    const signed = await (
      await routes.ticket(request("ticket"), context)
    ).json();
    assert.equal(
      readCoastIdentity(signed.data.ticket, secret, now)?.host,
      true,
    );
    hostId = other.id;
    const unassigned = await (
      await routes.ticket(request("ticket"), context)
    ).json();
    assert.equal(
      readCoastIdentity(unassigned.data.ticket, secret, now)?.host,
      false,
    );
    principal = { ...principal, role: "reader" };
    hostId = owner.id;
    const reader = await (
      await routes.ticket(request("ticket"), context)
    ).json();
    assert.equal(
      readCoastIdentity(reader.data.ticket, secret, now)?.host,
      false,
    );
    const receipt = issueCoastReceipt(evidence(owner.id), secret, now);
    assert.equal(
      (await save({ receipt }, "https://other.example")).status,
      403,
    );
    assert.equal((await save({ receipt, withHost: true })).status, 400);
    assert.equal((await save({ receipt: receipt + "x" })).status, 403);
    assert.equal(
      (
        await save({
          receipt: issueCoastReceipt(evidence(owner.id), secret, now - 300_001),
        })
      ).status,
      403,
    );
    const first = await (await save({ receipt })).json();
    const repeated = await (await save({ receipt })).json();
    assert.equal(first.data.id, repeated.data.id);
    assert.equal("userId" in first.data, false);
    for (let i = 0; i < 22; i++)
      await coastMemoryStore(db).save(
        owner.id,
        readCoastReceipt(
          issueCoastReceipt(
            {
              ...evidence(owner.id),
              source: `photo:${randomUUID()}`,
              kind: "photo",
            },
            secret,
            now,
          ),
          secret,
          now,
        )!,
      );
    const page = await (await list()).json();
    assert.equal(page.data.items.length, 20);
    const tail = await (await list(page.data.next)).json();
    assert.equal(tail.data.items.length, 3);
    assert.equal(tail.data.next, null);
    assert.equal(
      new Set(
        [...page.data.items, ...tail.data.items].map(
          (item: { id: string }) => item.id,
        ),
      ).size,
      23,
    );
    principal = {
      id: other.id,
      displayName: other.displayName,
      role: "reader",
    };
    assert.equal((await save({ receipt })).status, 403);
    assert.equal((await list(first.data.id)).status, 404);
    assert.deepEqual((await (await list()).json()).data.items, []);
    // A fresh repository instance still sees the saved records.
    assert.equal((await coastMemoryStore(db).list(owner.id)).items.length, 20);
  } finally {
    await fixture.close();
  }
});
