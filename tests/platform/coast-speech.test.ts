import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { io, type Socket } from "socket.io-client";
import {
  coastSaySchema,
  type CoastJoinAck,
  type CoastSnapshot,
} from "../../src/shared/contracts/coast-space";
import {
  emptyCoastRoom,
  joinCoastRoom,
  coastRoomSnapshot,
  leaveCoastRoom,
} from "../../src/modules/world/domain/coast-room";
import {
  sayInCoastRoom,
  pruneCoastSpeech,
} from "../../src/modules/world/domain/coast-speech";
import { defaultAvatar } from "../../src/modules/world/domain/coast-avatar";
import { issueCoastIdentity } from "../../src/server/realtime/coast-tokens";
import { createGateway } from "../../services/realtime/gateway";
import { memoryCoastStore } from "../../services/realtime/coast-store";

test("nearby speech enforces identity, ownership, account rate, retry, range and expiry", () => {
  const now = 100_000,
    room = emptyCoastRoom(now),
    subject = randomUUID();
  const add = (owner: string, authenticated: boolean) => {
    const result = joinCoastRoom(
      room,
      owner,
      owner,
      randomUUID(),
      defaultAvatar,
      now,
      authenticated
        ? {
            purpose: "coast-identity",
            subject,
            name: "Reader",
            host: false,
            issuedAt: now,
            expiresAt: now + 60_000,
          }
        : null,
    );
    assert.notEqual(result, "ROOM_FULL");
    if (typeof result === "string") throw new Error(result);
    return result;
  };
  const a = add("a", true),
    b = add("b", true),
    guest = add("guest", false);
  const message = { id: randomUUID(), text: "The stars are lovely." };
  assert.equal(
    sayInCoastRoom(room, guest.player.id, "guest", message, now),
    "AUTH_REQUIRED",
  );
  assert.equal(
    sayInCoastRoom(room, a.player.id, "intruder", message, now),
    "SUPERSEDED",
  );
  assert.equal(sayInCoastRoom(room, a.player.id, "a", message, now), null);
  assert.equal(sayInCoastRoom(room, a.player.id, "a", message, now), null);
  assert.equal(room.speech?.length, 1);
  assert.equal(
    coastRoomSnapshot(room, now, b.player.id, true).speech?.length,
    1,
  );
  assert.equal(coastRoomSnapshot(room, now, b.player.id).speech, undefined);
  b.player.x = 90;
  assert.equal(
    coastRoomSnapshot(room, now, b.player.id, true).speech?.length,
    0,
  );
  b.player.x = a.player.x;
  assert.equal(
    sayInCoastRoom(
      room,
      a.player.id,
      "a",
      { ...message, id: randomUUID() },
      now + 1,
    ),
    null,
  );
  assert.equal(
    sayInCoastRoom(
      room,
      b.player.id,
      "b",
      { ...message, id: randomUUID() },
      now + 2,
    ),
    null,
  );
  assert.equal(
    sayInCoastRoom(
      room,
      b.player.id,
      "b",
      { ...message, id: randomUUID() },
      now + 3,
    ),
    "RATE_LIMITED",
  );
  pruneCoastSpeech(room, now + 20_003);
  assert.deepEqual(room.speech, []);
  assert.deepEqual(room.speechRates, {});
  a.identity!.expiresAt = now;
  assert.equal(
    sayInCoastRoom(room, a.player.id, "a", message, now + 21_000),
    "AUTH_REQUIRED",
  );
});

test("speech rejects impersonation fields, invisible controls, empty and oversized text", () => {
  const input = { id: randomUUID(), text: "Hello" };
  assert.ok(coastSaySchema.safeParse(input).success);
  for (const value of [
    { ...input, playerId: randomUUID() },
    { ...input, x: 4 },
    { ...input, text: " " },
    { ...input, text: "a".repeat(181) },
    { ...input, text: "hello\u202Ehost" },
    { ...input, text: "hello\nworld" },
  ])
    assert.equal(coastSaySchema.safeParse(value).success, false);
});

function snapshot(socket: Socket, predicate: (s: CoastSnapshot) => boolean) {
  return new Promise<CoastSnapshot>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("world:snapshot", receive);
      reject(new Error("Snapshot timeout"));
    }, 4000);
    function receive(value: CoastSnapshot) {
      if (predicate(value)) {
        clearTimeout(timer);
        socket.off("world:snapshot", receive);
        resolve(value);
      }
    }
    socket.on("world:snapshot", receive);
  });
}
test(
  "two gateways deliver real player speech only to nearby capable clients",
  { timeout: 15000 },
  async () => {
    const token = "coast-speech-integration-test-key-at-least-32-characters";
    const now = Date.now(),
      store = memoryCoastStore(() => now);
    const gateways = await Promise.all(
      [1, 2].map(() =>
        createGateway(
          {
            host: "127.0.0.1",
            port: 0,
            token,
            origins: ["http://localhost:3000"],
            namespace: "test:speech",
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
      async function connect(
        url: string,
        speech: boolean,
        authenticated = false,
      ) {
        const socket = io(url, {
          transports: ["websocket"],
          forceNew: true,
          reconnection: false,
          auth: { version: 1, role: "reader" },
          extraHeaders: { Origin: "http://localhost:3000" },
        });
        sockets.push(socket);
        await new Promise<void>((resolve, reject) => {
          socket.once("connect", resolve);
          socket.once("connect_error", reject);
        });
        const result: CoastJoinAck = await socket
          .timeout(3000)
          .emitWithAck("world:join", {
            version: 1,
            appearance: defaultAvatar,
            ...(speech ? { speechVersion: 1 } : {}),
            ...(authenticated
              ? {
                  identityTicket: issueCoastIdentity(
                    {
                      subject: randomUUID(),
                      name: "Test traveler",
                      host: false,
                    },
                    token,
                    now,
                  ),
                }
              : {}),
          });
        assert.ok(result.ok);
        if (!result.ok) throw new Error("Join failed");
        return { socket, result };
      }
      const a = await connect(urls[0], true, true),
        b = await connect(urls[1], true),
        far = await connect(urls[1], true),
        legacy = await connect(urls[0], false);
      assert.equal(a.result.speechVersion, 1);
      assert.equal(legacy.result.snapshot.speech, undefined);
      await store.mutate((room) => {
        room.sessions[far.result.playerId].player.x = 90;
      });
      const id = randomUUID(),
        received = snapshot(
          b.socket,
          (s) => s.speech?.some((line) => line.id === id) ?? false,
        );
      assert.deepEqual(
        await a.socket
          .timeout(3000)
          .emitWithAck("world:say", { id, text: "Hello from this shore" }),
        { ok: true },
      );
      const delivered = await received;
      assert.equal(delivered.speech![0].playerId, a.result.playerId);
      assert.equal(
        delivered.players.find((p) => p.id === a.result.playerId)?.name,
        "Test traveler",
      );
      assert.deepEqual(
        (await snapshot(far.socket, (s) => s.players.length === 4)).speech,
        [],
      );
      assert.equal(
        (await snapshot(legacy.socket, (s) => s.players.length === 4)).speech,
        undefined,
      );
      assert.deepEqual(
        await b.socket
          .timeout(3000)
          .emitWithAck("world:say", { id: randomUUID(), text: "guest" }),
        { ok: false, code: "AUTH_REQUIRED" },
      );
      assert.deepEqual(
        await a.socket.timeout(3000).emitWithAck("world:say", {
          id: randomUUID(),
          text: "spoof",
          playerId: b.result.playerId,
        }),
        { ok: false, code: "INVALID_PAYLOAD" },
      );
      await store.mutate((room) =>
        leaveCoastRoom(room, a.result.playerId, a.socket.id!),
      );
      assert.equal(
        (await snapshot(b.socket, (s) => s.players.length === 3)).speech
          ?.length,
        0,
      );
    } finally {
      sockets.forEach((socket) => socket.disconnect());
      await Promise.all(gateways.map((gateway) => gateway.close()));
    }
  },
);
