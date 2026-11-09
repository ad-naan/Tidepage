import type { Server } from "socket.io";
import type {
  ClientEvents,
  ServerEvents,
} from "../../src/shared/realtime/protocol";
import {
  readerPageLimit,
  readerPageSchema,
  readerSnapshotInterval,
  type ReaderCount,
  type ReaderPage,
} from "../../src/shared/realtime/readers";

export interface ReaderClusterEvents {
  "readers:collect": (ack: (counts: ReaderCount[]) => void) => void;
}

const room = "public:readers";
const updateSchema = readerPageSchema.nullable();

function increment(
  counts: Map<string, ReaderCount>,
  page: ReaderPage,
  count: number,
) {
  const key = `${page.locale}:${page.path}`;
  const current = counts.get(key);
  if (current) current.count += count;
  else counts.set(key, { locale: page.locale, path: page.path, count });
}

export function attachReadersGateway(
  io: Server<ClientEvents, ServerEvents, ReaderClusterEvents>,
  clusterReady?: () => boolean,
) {
  const readers = new Map<string, ReaderPage | null>();
  let collecting = false;
  let stopped = false;

  function localCounts() {
    const counts = new Map<string, ReaderCount>();
    for (const page of readers.values()) if (page) increment(counts, page, 1);
    return [...counts.values()];
  }

  async function publish() {
    if (stopped || collecting || readers.size === 0) return;
    collecting = true;
    try {
      if (clusterReady && !clusterReady())
        throw new Error("Reader stats unavailable");
      const remote = clusterReady
        ? await io.serverSideEmitWithAck("readers:collect")
        : [];
      const counts = new Map<string, ReaderCount>();
      let total = 0;
      for (const group of [localCounts(), ...remote]) {
        for (const page of group) {
          increment(counts, page, page.count);
          total += page.count;
        }
      }
      const pages = [...counts.values()]
        .sort(
          (a, b) =>
            b.count - a.count ||
            a.path.localeCompare(b.path) ||
            a.locale.localeCompare(b.locale),
        )
        .slice(0, readerPageLimit);
      if (!stopped)
        io.local.to(room).emit("readers:snapshot", { total, pages });
    } catch {
      if (!stopped) io.local.to(room).emit("readers:snapshot", null);
    } finally {
      collecting = false;
    }
  }

  io.on("readers:collect", (ack) => ack(localCounts()));
  io.on("connection", (socket) => {
    if (socket.data.publisher) return;
    let updates = 0;
    let windowStart = Date.now();
    socket.on("readers:page", (raw) => {
      if (Date.now() - windowStart >= 10_000) {
        updates = 0;
        windowStart = Date.now();
      }
      if (++updates > 30) return;
      const result = updateSchema.safeParse(raw);
      if (!result.success) return;
      const firstReport = !readers.has(socket.id);
      readers.set(socket.id, result.data);
      if (firstReport) {
        void socket.join(room);
        void publish();
      }
    });
    socket.on("disconnect", () => readers.delete(socket.id));
  });

  const timer = setInterval(() => void publish(), readerSnapshotInterval);
  timer.unref();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
