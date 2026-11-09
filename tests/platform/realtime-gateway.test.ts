import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { io, type Socket } from "socket.io-client";
import { createClient } from "redis";
import { createGateway } from "../../services/realtime/gateway";
import {
  memoryPresenceStore,
  redisPresenceStore,
} from "../../services/realtime/presence-store";
import { readGatewayConfig } from "../../services/realtime/config";
import {
  presenceUpdateSchema,
  type PresenceUpdate,
  type PresenceSnapshot,
  type RealtimeAck,
} from "../../src/shared/realtime/protocol";
import type { ReaderSnapshot } from "../../src/shared/realtime/readers";

const token = "a-local-integration-test-token-of-at-least-32-chars";
type SocketArgs = {
  connect: [];
  connect_error: [Error];
  "author:snapshot": [PresenceSnapshot];
};
function socketEvent<K extends keyof SocketArgs>(
  socket: Socket,
  event: K,
): Promise<SocketArgs[K]> {
  const emitter = socket as unknown as {
    once(event: string, listener: (...args: unknown[]) => void): void;
    off(event: string, listener: (...args: unknown[]) => void): void;
  };
  return new Promise((resolve, reject) => {
    const listener = (...args: unknown[]) => {
      clearTimeout(timer);
      resolve(args as SocketArgs[K]);
    };
    const timer = setTimeout(() => {
      emitter.off(event, listener);
      reject(new Error(`Socket event timeout: ${event}`));
    }, 8000);
    emitter.once(event, listener);
  });
}
const online: PresenceUpdate = {
  version: 1,
  sequence: 1,
  status: "online",
  apps: [{ id: "editor", name: "Integration Editor" }],
  track: {
    title: "Integration Song",
    artist: "Test Artist",
    player: "Test Player",
  },
};
async function connect(url: string, role: "reader" | "author", secret = token) {
  const socket = io(url, {
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
    autoConnect: false,
    auth: { version: 1, role, token: secret },
  });
  const connected = socketEvent(socket, "connect");
  socket.connect();
  await connected;
  return socket;
}
function publish(socket: Socket, payload: unknown): Promise<RealtimeAck> {
  return socket.timeout(3000).emitWithAck("author:update", payload);
}
function read(socket: Socket): Promise<PresenceSnapshot> {
  return socket.timeout(3000).emitWithAck("author:read");
}
async function fixture(
  redisUrl?: string,
  namespace = `test:${crypto.randomUUID()}`,
) {
  const gateway = await createGateway({
    host: "127.0.0.1",
    port: 0,
    token,
    origins: ["http://localhost:3000"],
    namespace,
    redisUrl,
  });
  const address = await gateway.listen();
  assert.ok(address && typeof address !== "string");
  return { gateway, url: `http://127.0.0.1:${address.port}` };
}

function nextReaderSnapshot(
  socket: Socket,
  predicate: (snapshot: ReaderSnapshot) => boolean,
): Promise<ReaderSnapshot> {
  return new Promise((resolve, reject) => {
    const accept = (snapshot: ReaderSnapshot | null) => {
      if (!snapshot || !predicate(snapshot)) return;
      clearTimeout(timer);
      socket.off("readers:snapshot", accept);
      resolve(snapshot);
    };
    const timer = setTimeout(() => {
      socket.off("readers:snapshot", accept);
      reject(new Error("Reader snapshot timeout"));
    }, 8_000);
    socket.on("readers:snapshot", accept);
  });
}

test("reader counts track public tabs, replace routes and discard hidden or disconnected tabs", async () => {
  const { gateway, url } = await fixture();
  const reader = await connect(url, "reader");
  const second = await connect(url, "reader");
  const author = await connect(url, "author");
  try {
    const home = { locale: "zh-CN", path: "/" };
    const article = { locale: "en", path: "/articles/fixture-article" };
    const initial = nextReaderSnapshot(
      reader,
      (snapshot) => snapshot.total === 1,
    );
    reader.emit("readers:page", home);
    assert.deepEqual((await initial).pages, [{ ...home, count: 1 }]);

    const added = nextReaderSnapshot(
      reader,
      (snapshot) => snapshot.total === 2,
    );
    second.emit("readers:page", home);
    author.emit("readers:page", home);
    assert.deepEqual((await added).pages, [{ ...home, count: 2 }]);

    const moved = nextReaderSnapshot(reader, (snapshot) =>
      snapshot.pages.some((page) => page.path === article.path),
    );
    second.emit("readers:page", article);
    second.emit("readers:page", { ...article, path: "/admin" });
    second.emit("readers:page", {
      ...article,
      path: "/articles/fixture-article?secret=1",
    });
    second.emit("readers:page", { ...article, title: "Injected text" });
    assert.deepEqual((await moved).pages, [
      { ...home, count: 1 },
      { ...article, count: 1 },
    ]);

    const hidden = nextReaderSnapshot(
      reader,
      (snapshot) => snapshot.total === 1,
    );
    second.emit("readers:page", null);
    assert.deepEqual((await hidden).pages, [{ ...home, count: 1 }]);

    const visible = nextReaderSnapshot(
      reader,
      (snapshot) => snapshot.total === 2,
    );
    second.emit("readers:page", article);
    await visible;
    const left = nextReaderSnapshot(reader, (snapshot) => snapshot.total === 1);
    second.disconnect();
    assert.deepEqual((await left).pages, [{ ...home, count: 1 }]);
  } finally {
    reader.disconnect();
    second.disconnect();
    author.disconnect();
    await gateway.close();
  }
});

test(
  "reader totals aggregate across gateways using Redis Streams",
  { skip: !process.env.REALTIME_TEST_REDIS_STREAMS_URL },
  async () => {
    const namespace = `test:${crypto.randomUUID()}`;
    const first = await fixture(
      process.env.REALTIME_TEST_REDIS_STREAMS_URL,
      namespace,
    );
    const second = await fixture(
      process.env.REALTIME_TEST_REDIS_STREAMS_URL,
      namespace,
    );
    const a = await connect(first.url, "reader");
    const b = await connect(second.url, "reader");
    try {
      const page = { locale: "en", path: "/gallery" };
      const result = nextReaderSnapshot(a, (snapshot) => snapshot.total === 2);
      a.emit("readers:page", page);
      b.emit("readers:page", page);
      assert.deepEqual((await result).pages, [{ ...page, count: 2 }]);
    } finally {
      a.disconnect();
      b.disconnect();
      await Promise.all([first.gateway.close(), second.gateway.close()]);
    }
  },
);

test("presence contract rejects private fields, non-PNG icons, duplicate IDs and non-empty pause", () => {
  assert.equal(presenceUpdateSchema.safeParse(online).success, true);
  for (const invalid of [
    { ...online, windowTitle: "private" },
    { ...online, apps: [{ id: "x", name: "X", path: "C:/secret" }] },
    {
      ...online,
      apps: [
        { id: "x", name: "X", icon: "data:image/svg+xml;base64,PHN2Zz4=" },
      ],
    },
    { ...online, apps: [online.apps[0], online.apps[0]] },
    { ...online, status: "paused" },
    { ...online, sequence: -1 },
  ])
    assert.equal(presenceUpdateSchema.safeParse(invalid).success, false);
});
test("production gateway requires Redis and a strong private token", () => {
  assert.throws(
    () =>
      readGatewayConfig({
        NODE_ENV: "production",
        REALTIME_AUTHOR_TOKEN: token,
        REDIS_URL: "redis://web-cache:6379",
      }),
    /REALTIME_REDIS_URL/,
  );
  assert.throws(() => readGatewayConfig({ REALTIME_AUTHOR_TOKEN: "short" }));
  assert.equal(
    readGatewayConfig({
      NODE_ENV: "production",
      REALTIME_AUTHOR_TOKEN: token,
      REALTIME_REDIS_URL: "redis://gateway:6379",
    }).redisUrl,
    "redis://gateway:6379",
  );
  assert.throws(() =>
    readGatewayConfig({
      REALTIME_AUTHOR_TOKEN: token,
      REALTIME_ORIGINS: "https://example.com/path",
    }),
  );
});
test("memory lease handles expiry, deduplication and old disconnects", async () => {
  let now = 1000;
  const store = memoryPresenceStore(() => now);
  await store.claim("first");
  assert.equal(await store.update("first", online), "OK");
  const snapshot = await store.read();
  now += 500;
  assert.equal(await store.update("first", { ...online, apps: [] }), "OK");
  assert.deepEqual(await store.read(), snapshot);
  assert.equal(
    await store.update("first", { ...online, sequence: 0 }),
    "SUPERSEDED",
  );
  await store.claim("second");
  assert.equal(await store.release("first"), false);
  assert.equal(
    await store.update("first", { ...online, sequence: 2 }),
    "SUPERSEDED",
  );
  assert.equal(await store.update("second", online), "OK");
  now += 75_001;
  assert.equal((await store.read()).status, "offline");
  assert.equal(
    await store.update("second", { ...online, sequence: 2 }),
    "LEASE_EXPIRED",
  );
});
test(
  "official Socket.IO clients authenticate, read snapshots, pause and reject superseded writers",
  { timeout: 15_000 },
  async () => {
    const { gateway, url } = await fixture();
    const sockets: Socket[] = [];
    try {
      const bad = io(url, {
        transports: ["websocket"],
        reconnection: false,
        auth: { version: 1, role: "author", token: "bad" },
      });
      sockets.push(bad);
      const [error] = await socketEvent(bad, "connect_error");
      assert.equal(error.message, "UNAUTHORIZED");
      const reader = await connect(url, "reader"),
        first = await connect(url, "author");
      sockets.push(reader, first);
      assert.deepEqual(await publish(reader, online), {
        ok: false,
        code: "SUPERSEDED",
      });
      assert.deepEqual(await publish(first, { ...online, path: "private" }), {
        ok: false,
        code: "INVALID_PAYLOAD",
      });
      const pushed = socketEvent(reader, "author:snapshot");
      assert.deepEqual(await publish(first, online), { ok: true });
      assert.equal((await pushed)[0].apps[0].name, "Integration Editor");
      const original = await read(reader);
      await publish(first, online);
      assert.deepEqual(await read(reader), original);
      const second = await connect(url, "author");
      sockets.push(second);
      assert.deepEqual(
        await publish(second, {
          ...online,
          apps: [{ id: "new", name: "New Editor" }],
        }),
        { ok: true },
      );
      assert.deepEqual(await publish(first, { ...online, sequence: 2 }), {
        ok: false,
        code: "SUPERSEDED",
      });
      first.disconnect();
      assert.equal((await read(reader)).apps[0].name, "New Editor");
      assert.deepEqual(
        await publish(second, {
          ...online,
          sequence: 2,
          status: "paused",
          apps: [],
          track: null,
        }),
        { ok: true },
      );
      const paused = await read(reader);
      assert.equal(paused.status, "paused");
      assert.deepEqual(paused.apps, []);
      assert.equal(paused.track, null);
      second.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 30));
      assert.equal((await read(reader)).status, "offline");
    } finally {
      for (const socket of sockets) socket.disconnect();
      await gateway.close();
    }
  },
);
test(
  "gateway rejects unknown browser origins and bounds event floods",
  { timeout: 10_000 },
  async () => {
    const { gateway, url } = await fixture();
    const author = await connect(url, "author");
    try {
      const outsider = io(url, {
        transports: ["websocket"],
        reconnection: false,
        extraHeaders: { Origin: "https://untrusted.example" },
        auth: { version: 1, role: "reader" },
      });
      try {
        await socketEvent(outsider, "connect_error");
        assert.equal(outsider.connected, false);
      } finally {
        outsider.disconnect();
      }
      const results = await Promise.all(
        Array.from({ length: 25 }, (_, i) =>
          publish(author, { ...online, sequence: i }),
        ),
      );
      assert.ok(results.some((r) => !r.ok && r.code === "RATE_LIMITED"));
    } finally {
      author.disconnect();
      await gateway.close();
    }
  },
);
test(
  "Redis authoritative leases match memory semantics",
  { skip: !process.env.REALTIME_TEST_REDIS_URL },
  async () => {
    const client = createClient({
      url: process.env.REALTIME_TEST_REDIS_URL,
      disableOfflineQueue: true,
      socket: { connectTimeout: 1500, reconnectStrategy: false },
    });
    client.on("error", () => {});
    await client.connect();
    const ns = `test:${crypto.randomUUID()}`;
    const store = redisPresenceStore(client, ns);
    try {
      await store.claim("a");
      assert.equal(await store.update("a", online), "OK");
      const first = await store.read();
      assert.equal(await store.update("a", { ...online, apps: [] }), "OK");
      assert.deepEqual(await store.read(), first);
      await store.claim("b");
      assert.equal(await store.release("a"), false);
      assert.equal(await store.update("a", online), "SUPERSEDED");
      assert.equal(
        await store.update("b", {
          ...online,
          status: "paused",
          apps: [],
          track: null,
        }),
        "OK",
      );
      assert.deepEqual((await store.read()).apps, []);
      await store.release("b");
      assert.equal((await store.read()).status, "offline");
    } finally {
      await client.del([
        `{${ns}:author}:lease`,
        `{${ns}:author}:state`,
        `{${ns}:author}:revision`,
      ]);
      client.destroy();
    }
  },
);
test(
  "two gateway instances share broadcasts and leases through Redis Streams",
  { skip: !process.env.REALTIME_TEST_REDIS_STREAMS_URL, timeout: 15_000 },
  async () => {
    const ns = `test:${crypto.randomUUID()}`;
    const a = await fixture(process.env.REALTIME_TEST_REDIS_STREAMS_URL, ns);
    const b = await fixture(process.env.REALTIME_TEST_REDIS_STREAMS_URL, ns);
    const writer = await connect(a.url, "author"),
      reader = await connect(b.url, "reader");
    try {
      const pushed = socketEvent(reader, "author:snapshot");
      await publish(writer, online);
      assert.equal((await pushed)[0].apps[0].name, "Integration Editor");
      assert.equal((await read(reader)).status, "online");
    } finally {
      writer.disconnect();
      reader.disconnect();
      await a.gateway.close();
      await b.gateway.close();
    }
  },
);
test(
  "native Go client interoperates with the official Socket.IO gateway",
  { skip: !process.env.REALTIME_GO_PROBE, timeout: 15_000 },
  async () => {
    const { gateway, url } = await fixture();
    const reader = await connect(url, "reader");
    const snapshots: PresenceSnapshot[] = [];
    reader.on("author:snapshot", (s) => snapshots.push(s));
    try {
      const child = spawn(process.env.REALTIME_GO_PROBE!, [], {
        env: {
          ...process.env,
          PROBE_REALTIME_URL: url,
          PROBE_REALTIME_TOKEN: token,
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      child.stdout.on("data", (data) => {
        output += data;
      });
      const [code] = await once(child, "exit");
      assert.equal(code, 0, output);
      assert.match(output, /ok/);
      assert.ok(
        snapshots.some(
          (s) =>
            s.status === "online" && s.apps[0]?.name === "Integration Editor",
        ),
      );
      assert.ok(
        snapshots.some(
          (s) =>
            s.status === "paused" && s.apps.length === 0 && s.track === null,
        ),
      );
    } finally {
      reader.disconnect();
      await gateway.close();
    }
  },
);
