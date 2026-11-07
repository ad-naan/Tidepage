import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { io, type Socket } from "socket.io-client";
import { createClient } from "redis";
import { createGateway } from "../../services/realtime/gateway";
import {
  issueCoastIdentity,
  readCoastReceipt,
} from "../../src/server/realtime/coast-tokens";
import {
  memoryCoastStore,
  redisCoastStore,
} from "../../services/realtime/coast-store";
import { defaultAvatar } from "../../src/modules/world/domain/coast-avatar";
import {
  emptyCoastRoom,
  joinCoastRoom,
  leaveCoastRoom,
  applyCoastInput,
  advanceCoastRoom,
  coastRoomSnapshot,
} from "../../src/modules/world/domain/coast-room";
import {
  coastInputSchema,
  coastJoinSchema,
  type CoastSnapshot,
  type CoastJoinAck,
  type CoastAck,
} from "../../src/shared/contracts/coast-space";

const token = "a-local-coast-integration-test-token-at-least-32-characters";

test(
  "real sockets verify host identity, isolate invitations across gateways and issue only account-bound server receipts",
  { timeout: 15_000 },
  async () => {
    let now = Date.now();
    const store = memoryCoastStore(() => now);
    const gateways = await Promise.all(
      [1, 2].map(() =>
        createGateway(
          {
            host: "127.0.0.1",
            port: 0,
            token,
            origins: ["http://localhost:3000"],
            namespace: "test:coast-social",
          },
          undefined,
          store,
        ),
      ),
    );
    const sockets: Socket[] = [];
    try {
      const urls = await Promise.all(
        gateways.map(async (gateway) => {
          const address = await gateway.listen();
          assert.ok(address && typeof address !== "string");
          return `http://127.0.0.1:${address.port}`;
        }),
      );
      const a = await connect(urls[0]),
        b = await connect(urls[1]),
        outsider = await connect(urls[0]);
      sockets.push(a, b, outsider);
      const subject = randomUUID();
      const hostTicket = issueCoastIdentity(
        {
          subject,
          name: "Verified host",
          host: true,
          avatarUrl: "https://avatars.githubusercontent.com/u/123?v=4",
        },
        token,
        now,
      );
      const first: CoastJoinAck = await a
        .timeout(3000)
        .emitWithAck("world:join", {
          version: 1,
          appearance: defaultAvatar,
          identityTicket: hostTicket,
        });
      const second = await join(b),
        third = await join(outsider);
      assert.ok(first.ok && second.ok && third.ok);
      if (!first.ok || !second.ok || !third.ok) return;
      assert.equal(first.movementVersion, 2);
      assert.equal(
        first.snapshot.players.find((p) => p.id === first.playerId)?.avatarUrl,
        "https://avatars.githubusercontent.com/u/123?v=4",
      );
      assert.equal(
        first.snapshot.players.find((p) => p.id === first.playerId)?.host,
        true,
      );
      assert.deepEqual(
        await b
          .timeout(3000)
          .emitWithAck("world:identity", hostTicket + "forged"),
        { ok: false, code: "AUTH_REQUIRED" },
      );
      assert.deepEqual(
        await b.timeout(3000).emitWithAck("world:receipt", { place: "beach" }),
        { ok: false, code: "AUTH_REQUIRED" },
      );
      assert.deepEqual(
        await a
          .timeout(3000)
          .emitWithAck("world:receipt", { place: "cottage" }),
        { ok: false, code: "OUT_OF_REACH" },
      );
      const invitation = snapshot(b, (s) => s.photo?.state === "pending");
      assert.deepEqual(
        await a
          .timeout(3000)
          .emitWithAck("photo:invite", { target: second.playerId }),
        { ok: true },
      );
      const pending = (await invitation).photo!;
      assert.equal(
        (await snapshot(outsider, (s) => s.players.length === 3)).photo,
        null,
      );
      assert.deepEqual(
        await outsider
          .timeout(3000)
          .emitWithAck("photo:respond", { id: pending.id, action: "accept" }),
        { ok: false, code: "NOT_JOINED" },
      );
      assert.deepEqual(
        await b
          .timeout(3000)
          .emitWithAck("photo:respond", { id: pending.id, action: "accept" }),
        { ok: true },
      );
      const capturedA = snapshot(a, (s) => s.photo?.state === "complete"),
        capturedB = snapshot(b, (s) => s.photo?.state === "complete");
      now += 4100;
      const [shotA, shotB] = await Promise.all([capturedA, capturedB]);
      assert.deepEqual(shotA.photo?.composition, shotB.photo?.composition);
      const readerSubject = randomUUID();
      assert.deepEqual(
        await b
          .timeout(3000)
          .emitWithAck(
            "world:identity",
            issueCoastIdentity(
              { subject: readerSubject, name: "Reader", host: false },
              token,
              now,
            ),
          ),
        { ok: true },
      );
      const photoReceipt = await b
        .timeout(3000)
        .emitWithAck("world:receipt", { photoId: pending.id });
      assert.equal(photoReceipt.ok, true);
      const proof = readCoastReceipt(photoReceipt.receipt, token, now)!;
      assert.equal(proof.subject, readerSubject);
      assert.equal(proof.withHost, true);
      assert.equal(proof.companionCount, 1);
      assert.deepEqual(
        await outsider.timeout(3000).emitWithAck("world:identity", hostTicket),
        { ok: true },
      );
      assert.deepEqual(
        await outsider
          .timeout(3000)
          .emitWithAck("world:receipt", { photoId: pending.id }),
        { ok: false, code: "PHOTO_EXPIRED" },
      );
      const visit = await a
        .timeout(3000)
        .emitWithAck("world:receipt", { place: "beach" });
      assert.equal(visit.ok, true);
      assert.equal(
        readCoastReceipt(visit.receipt, token, now)?.source,
        `visit:${proof.day}:beach`,
      );
      assert.equal(JSON.stringify(shotA).includes(subject), false);
      assert.equal(JSON.stringify(shotA).includes(hostTicket), false);
    } finally {
      sockets.forEach((s) => s.disconnect());
      await Promise.all(gateways.map((g) => g.close()));
    }
  },
);
const join = (socket: Socket, resumeToken?: string): Promise<CoastJoinAck> =>
  socket.timeout(3000).emitWithAck("world:join", {
    version: 1,
    appearance: defaultAvatar,
    ...(resumeToken ? { resumeToken } : {}),
  });
const input = (
  sequence: number,
  x = 0,
  z = 0,
  action: "idle" | "wave" | "sit" = "idle",
) => ({ sequence, direction: { x, z }, action });

test("world protocol accepts intent only, with bounded direction and appearance", () => {
  assert.equal(coastInputSchema.safeParse(input(1, 0.6, 0.8)).success, true);
  for (const value of [
    input(1, 1, 1),
    input(-1),
    input(1, NaN),
    { ...input(1), x: 99 },
    { ...input(1), playerId: randomUUID() },
  ])
    assert.equal(coastInputSchema.safeParse(value).success, false);
  assert.equal(
    coastJoinSchema.safeParse({
      version: 1,
      appearance: defaultAvatar,
      role: "author",
    }).success,
    false,
  );
});

test("authoritative movement bounds speed, collision, stale input and duplicate sequences", () => {
  const room = emptyCoastRoom(1000),
    id = randomUUID();
  const session = joinCoastRoom(
    room,
    "owner",
    "private-hash",
    id,
    defaultAvatar,
    1000,
  );
  assert.notEqual(session, "ROOM_FULL");
  if (session === "ROOM_FULL") return;
  session.player.x = 0;
  session.player.z = 5;
  assert.equal(applyCoastInput(room, id, "owner", input(1, 0, -1), 1000), null);
  advanceCoastRoom(room, 1100);
  assert.ok(Math.abs(session.player.z - 4.76) < 0.001);
  applyCoastInput(room, id, "owner", input(1, 1, 0), 1100);
  advanceCoastRoom(room, 1200);
  assert.equal(session.player.x, 0);
  advanceCoastRoom(room, 3000);
  assert.equal(session.player.pose, "idle");
  assert.ok(session.player.z >= 4.5);
  session.player.x = 0;
  session.player.z = 9.95;
  applyCoastInput(room, id, "owner", input(2, 0, 1), 3000);
  advanceCoastRoom(room, 3100);
  assert.ok(session.player.z <= 10);
  advanceCoastRoom(room, 20_000);
  assert.equal(coastRoomSnapshot(room, 20_000).players.length, 0);
  assert.equal(
    applyCoastInput(room, id, "owner", input(3), 20_000),
    "NOT_JOINED",
  );
});

test("seats are allocated once, require proximity and cannot overlap", () => {
  const room = emptyCoastRoom(1000);
  const seats: number[] = [];
  for (let i = 0; i < 4; i++) {
    const id = randomUUID();
    const session = joinCoastRoom(room, id, id, id, defaultAvatar, 1000);
    assert.notEqual(session, "ROOM_FULL");
    if (session === "ROOM_FULL") return;
    assert.equal(
      applyCoastInput(room, id, id, input(1, 0, 0, "sit"), 1000),
      "OUT_OF_REACH",
    );
    session.player.x = -5;
    session.player.z = -1.5;
    const result = applyCoastInput(room, id, id, input(2, 0, 0, "sit"), 1000);
    assert.equal(result, i < 3 ? null : "SEAT_TAKEN");
    if (i < 3) seats.push(session.player.x);
  }
  assert.equal(new Set(seats).size, 3);
  for (const a of seats)
    for (const b of seats) if (a !== b) assert.ok(Math.abs(a - b) >= 1.05);
});

test("guest resume preserves identity and rejects old-owner updates and disconnect", () => {
  const room = emptyCoastRoom(1000),
    id = randomUUID();
  joinCoastRoom(room, "old", "secret", id, defaultAvatar, 1000);
  const resumed = joinCoastRoom(
    room,
    "new",
    "secret",
    randomUUID(),
    defaultAvatar,
    1200,
  );
  assert.notEqual(resumed, "ROOM_FULL");
  if (resumed === "ROOM_FULL") return;
  assert.equal(resumed.player.id, id);
  assert.equal(applyCoastInput(room, id, "old", input(9), 1200), "SUPERSEDED");
  leaveCoastRoom(room, id, "old");
  const snapshot = coastRoomSnapshot(room, 1200);
  assert.equal(snapshot.players.length, 1);
  assert.equal(JSON.stringify(snapshot).includes("secret"), false);
  assert.equal(JSON.stringify(snapshot).includes("owner"), false);
  for (let i = 1; i < 12; i++)
    joinCoastRoom(
      room,
      `owner-${i}`,
      `hash-${i}`,
      randomUUID(),
      defaultAvatar,
      1200,
    );
  assert.equal(
    joinCoastRoom(
      room,
      "overflow",
      "overflow",
      randomUUID(),
      defaultAvatar,
      1200,
    ),
    "ROOM_FULL",
  );
});

async function connect(url: string) {
  const socket = io(url, {
    forceNew: true,
    autoConnect: false,
    transports: ["websocket"],
    reconnection: false,
    auth: { version: 1, role: "reader" },
  });
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
    socket.connect();
  });
  return socket;
}
function snapshot(
  socket: Socket,
  matches: (s: CoastSnapshot) => boolean,
): Promise<CoastSnapshot> {
  return new Promise((resolve, reject) => {
    const listener = (value: CoastSnapshot) => {
      if (!matches(value)) return;
      clearTimeout(timer);
      socket.off("world:snapshot", listener);
      resolve(value);
    };
    const timer = setTimeout(() => {
      socket.off("world:snapshot", listener);
      reject(new Error("Coast snapshot timeout"));
    }, 5000);
    socket.on("world:snapshot", listener);
  });
}

test(
  "two gateways share real guest movement, outfits, actions and reconnection without duplicate players",
  { timeout: 20_000 },
  async () => {
    const store = memoryCoastStore();
    const gateways = await Promise.all(
      [1, 2].map(() =>
        createGateway(
          {
            host: "127.0.0.1",
            port: 0,
            token,
            origins: ["http://localhost:3000"],
            namespace: "test:coast",
          },
          undefined,
          store,
        ),
      ),
    );
    const sockets: Socket[] = [];
    try {
      const urls = await Promise.all(
        gateways.map(async (gateway) => {
          const address = await gateway.listen();
          assert.ok(address && typeof address !== "string");
          return `http://127.0.0.1:${address.port}`;
        }),
      );
      const first = await connect(urls[0]),
        second = await connect(urls[1]);
      sockets.push(first, second);
      const a = await join(first),
        b = await join(second);
      assert.ok(a.ok && b.ok);
      if (!a.ok || !b.ok) return;
      const both = await snapshot(first, (s) => s.players.length === 2);
      assert.equal(
        both.players.some((p) => p.id === b.playerId),
        true,
      );
      const waving = snapshot(second, (s) =>
        s.players.some((p) => p.id === a.playerId && p.pose === "wave"),
      );
      const waveAck: CoastAck = await first
        .timeout(3000)
        .emitWithAck("world:input", input(1, 0, 0, "wave"));
      assert.equal(waveAck.ok, true);
      await waving;
      const changed = snapshot(first, (s) =>
        s.players.some(
          (p) => p.id === b.playerId && p.appearance.coat === "coral",
        ),
      );
      await second
        .timeout(3000)
        .emitWithAck("world:appearance", { ...defaultAvatar, coat: "coral" });
      await changed;
      const start = both.players.find((p) => p.id === a.playerId)!;
      const moving = snapshot(second, (s) =>
        s.players.some((p) => p.id === a.playerId && p.x > start.x + 0.1),
      );
      await first.timeout(3000).emitWithAck("world:input", input(2, 1, 0));
      await moving;
      const replacement = await connect(urls[1]);
      sockets.push(replacement);
      const resumed = await join(replacement, a.resumeToken);
      assert.ok(resumed.ok);
      if (!resumed.ok) return;
      assert.equal(resumed.playerId, a.playerId);
      const stale: CoastAck = await first
        .timeout(3000)
        .emitWithAck("world:input", input(3));
      assert.deepEqual(stale, { ok: false, code: "SUPERSEDED" });
      first.disconnect();
      assert.equal(
        (await snapshot(second, (s) => s.players.length === 2)).players.filter(
          (p) => p.id === a.playerId,
        ).length,
        1,
      );
      const left = snapshot(second, (s) => s.players.length === 1);
      await replacement.timeout(3000).emitWithAck("world:leave");
      await left;
    } finally {
      sockets.forEach((socket) => socket.disconnect());
      await Promise.all(gateways.map((gateway) => gateway.close()));
    }
  },
);

test(
  "Redis room CAS retains concurrent joins across store instances",
  { skip: !process.env.REALTIME_TEST_REDIS_STREAMS_URL },
  async () => {
    const client = createClient({
      url: process.env.REALTIME_TEST_REDIS_STREAMS_URL,
    });
    await client.connect();
    const namespace = `test:coast:${randomUUID()}`;
    try {
      const stores = [
        redisCoastStore(client, namespace),
        redisCoastStore(client, namespace),
      ];
      await Promise.all(
        stores.map((store, i) =>
          store.mutate((room, now) =>
            joinCoastRoom(
              room,
              `owner-${i}`,
              `hash-${i}`,
              randomUUID(),
              defaultAvatar,
              now,
            ),
          ),
        ),
      );
      const value = await stores[0].mutate((room, now) =>
        coastRoomSnapshot(room, now),
      );
      assert.equal(value.players.length, 2);
    } finally {
      await client.del(`{${namespace}:world}:sunset:v1`);
      client.destroy();
    }
  },
);
