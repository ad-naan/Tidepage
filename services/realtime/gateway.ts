import { createHash, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-streams-adapter";
import {
  offlineSnapshot,
  presenceUpdateSchema,
  type ClientEvents,
  type ServerEvents,
  type RealtimeAck,
} from "../../src/shared/realtime/protocol";
import { createLocalBus, createRedisBus } from "../../src/server/realtime/bus";
import type { GatewayConfig } from "./config";
import { attachCoastGateway } from "./coast-gateway";
import {
  memoryCoastStore,
  redisCoastStore,
  type CoastStore,
} from "./coast-store";
import {
  memoryPresenceStore,
  redisPresenceStore,
  type PresenceStore,
} from "./presence-store";

function validToken(candidate: unknown, token: string) {
  return (
    typeof candidate === "string" &&
    candidate.length <= 512 &&
    timingSafeEqual(
      createHash("sha256").update(candidate).digest(),
      createHash("sha256").update(token).digest(),
    )
  );
}
export async function createGateway(
  config: GatewayConfig,
  injectedStore?: PresenceStore,
  injectedCoastStore?: CoastStore,
) {
  const redis = config.redisUrl
    ? createClient({
        url: config.redisUrl,
        disableOfflineQueue: true,
        socket: {
          connectTimeout: 2000,
          reconnectStrategy: (n) => Math.min(250 * 2 ** Math.min(n, 5), 5000),
        },
      })
    : undefined;
  redis?.on("error", () => console.warn("realtime.redis_unavailable"));
  if (redis) {
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        redis.connect(),
        new Promise<never>((_, reject) => {
          deadline = setTimeout(
            () => reject(new Error("Realtime Redis startup timeout")),
            7000,
          );
        }),
      ]);
    } catch (e) {
      redis.destroy();
      throw e;
    } finally {
      clearTimeout(deadline);
    }
  }
  const report = () => console.warn("realtime.bus_unavailable");
  let bus;
  try {
    bus = config.redisUrl
      ? await createRedisBus(config.redisUrl, config.namespace, report)
      : createLocalBus(config.namespace, report);
  } catch (e) {
    redis?.destroy();
    throw e;
  }
  const store =
    injectedStore ??
    (redis
      ? redisPresenceStore(redis, config.namespace)
      : memoryPresenceStore());
  const http = createServer((req, res) => {
    const healthy = !redis || redis.isReady;
    res.writeHead(req.url === "/healthz" ? (healthy ? 200 : 503) : 404, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify({ ok: req.url === "/healthz" && healthy }));
  });
  const attempts = new Map<string, { until: number; count: number }>();
  const io = new Server<ClientEvents, ServerEvents>(http, {
    transports: ["websocket"],
    maxHttpBufferSize: 300_000,
    perMessageDeflate: false,
    pingInterval: 25_000,
    pingTimeout: 20_000,
    cors: { origin: config.origins },
    // All consumers resync authoritative snapshots after reconnect. Future durable
    // commands need their own persistence and idempotency, not in-memory recovery.
    allowRequest: (request, done) => {
      if (
        request.headers.origin &&
        !config.origins.includes(request.headers.origin)
      ) {
        done(null, false);
        return;
      }
      const ip = request.socket.remoteAddress ?? "unknown",
        now = Date.now();
      let rate = attempts.get(ip);
      if (!rate || rate.until <= now) {
        if (attempts.size >= 10_000 && !rate) {
          done(null, false);
          return;
        }
        rate = { until: now + 60_000, count: 0 };
        attempts.set(ip, rate);
      }
      done(null, ++rate.count <= 300);
    },
  });
  if (redis)
    io.adapter(
      createAdapter(redis, {
        streamName: `${config.namespace}:socket.io`,
        channelPrefix: `${config.namespace}:socket.io:control:`,
        sessionKeyPrefix: `${config.namespace}:socket.io:session:`,
        maxLen: 10_000,
        onlyPlaintext: true,
      }),
    );
  const cleanup = setInterval(() => {
    for (const [k, v] of attempts) if (v.until < Date.now()) attempts.delete(k);
  }, 60_000);
  cleanup.unref();
  io.use(async (socket, next) => {
    if (socket.handshake.auth.version !== 1)
      return next(new Error("PROTOCOL_VERSION"));
    const role = socket.handshake.auth.role;
    if (role !== "author" && role !== "reader")
      return next(new Error("INVALID_ROLE"));
    if (
      role === "author" &&
      !validToken(socket.handshake.auth.token, config.token)
    )
      return next(new Error("UNAUTHORIZED"));
    socket.data.publisher = role === "author";
    try {
      if (socket.data.publisher) {
        await store.claim(socket.id);
        // Leases are acquired before connection; release if the transport vanished.
        if (socket.conn.readyState !== "open") {
          await store.release(socket.id);
          return next(new Error("DISCONNECTED"));
        }
      }
      next();
    } catch {
      next(new Error("UNAVAILABLE"));
    }
  });
  const broadcast = async () => {
    const snapshot = await store.read();
    io.to("public:author").emit("author:snapshot", snapshot);
    await bus.publish("author:changed", JSON.stringify(snapshot));
  };
  io.on("connection", (socket) => {
    if (!socket.data.publisher) void socket.join("public:author");
    let queue = Promise.resolve(),
      queued = 0,
      count = 0,
      windowStart = Date.now();
    const limited = () => {
      if (Date.now() - windowStart >= 10_000) {
        count = 0;
        windowStart = Date.now();
      }
      return ++count > 20;
    };
    socket.on("author:read", (ack) => {
      if (typeof ack !== "function" || limited()) return;
      void store
        .read()
        .then(ack)
        .catch(() => ack(offlineSnapshot()));
    });
    socket.on("author:update", (raw, ack) => {
      if (typeof ack !== "function") return;
      const reply = (result: RealtimeAck) => ack(result);
      if (!socket.data.publisher) {
        reply({ ok: false, code: "SUPERSEDED" });
        return;
      }
      if (limited() || queued >= 4) {
        reply({ ok: false, code: "RATE_LIMITED" });
        return;
      }
      const parsed = presenceUpdateSchema.safeParse(raw);
      if (!parsed.success) {
        reply({ ok: false, code: "INVALID_PAYLOAD" });
        return;
      }
      queued++;
      queue = queue
        .then(async () => {
          if (!socket.connected) return;
          const result = await store.update(socket.id, parsed.data);
          if (result !== "OK") {
            reply({ ok: false, code: result });
            return;
          }
          await broadcast();
          reply({ ok: true });
        })
        .catch(() => reply({ ok: false, code: "UNAVAILABLE" }))
        .finally(() => {
          queued--;
        });
    });
    socket.on("disconnect", () => {
      if (!socket.data.publisher) return;
      void queue
        .then(async () => {
          if (await store.release(socket.id)) await broadcast();
        })
        .catch(report);
    });
  });
  const closeCoast = attachCoastGateway(
    io,
    injectedCoastStore ??
      (redis ? redisCoastStore(redis, config.namespace) : memoryCoastStore()),
    config.token,
  );
  return {
    io,
    http,
    store,
    bus,
    async listen() {
      await new Promise<void>((resolve, reject) => {
        http.once("error", reject);
        http.listen(config.port, config.host, resolve);
      });
      return http.address();
    },
    async close() {
      closeCoast();
      clearInterval(cleanup);
      await new Promise<void>((resolve) => io.close(() => resolve()));
      await bus.close();
      if (redis?.isOpen) redis.destroy();
    },
  };
}
