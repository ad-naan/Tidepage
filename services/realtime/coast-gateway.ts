import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Server } from "socket.io";
import type {
  ClientEvents,
  ServerEvents,
} from "../../src/shared/realtime/protocol";
import {
  coastAvatarSchema,
  coastInputSchema,
  coastJoinSchema,
  coastPhotoInviteSchema,
  coastPhotoRespondSchema,
  coastReceiptRequestSchema,
  type CoastAck,
  type CoastJoinAck,
} from "../../src/shared/contracts/coast-space";
import type { CoastReceipt } from "../../src/shared/contracts/coast-memories";
import {
  readCoastIdentity,
  issueCoastReceipt,
  coastDay,
} from "../../src/server/realtime/coast-tokens";
import {
  inviteCoastPhoto,
  respondCoastPhoto,
} from "../../src/modules/world/domain/coast-photo";
import { harborPlaces } from "../../src/modules/world/domain/coast-harbor";
import {
  advanceCoastRoom,
  applyCoastInput,
  coastRoomSnapshot,
  joinCoastRoom,
  leaveCoastRoom,
} from "../../src/modules/world/domain/coast-room";
import type { CoastStore } from "./coast-store";

const channel = "world:sunset";
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export function attachCoastGateway(
  io: Server<ClientEvents, ServerEvents>,
  store: CoastStore,
  signingKey: string,
) {
  const members = new Map<string, string>();
  let ticking = false,
    closed = false;
  const tick = setInterval(() => {
    if (closed || ticking || !members.size) return;
    ticking = true;
    void store
      .mutate((room, now) => {
        advanceCoastRoom(room, now);
        return Array.from(members, ([owner, id]) => ({
          owner,
          snapshot: coastRoomSnapshot(room, now, id),
        }));
      })
      .then((snapshots) => {
        if (!closed)
          for (const item of snapshots)
            io.local.to(item.owner).emit("world:snapshot", item.snapshot);
      })
      .catch(() => {
        /* No speculative local fallback when the authoritative store is unavailable. */
      })
      .finally(() => {
        ticking = false;
      });
  }, 100);
  tick.unref();
  io.on("connection", (socket) => {
    let membership: { id: string; token: string } | null = null;
    let queue = Promise.resolve(),
      pending = 0;
    const rates = new Map<string, { started: number; count: number }>();
    const limited = (event: string, max: number) => {
      const now = Date.now();
      let rate = rates.get(event);
      if (!rate || now - rate.started >= 1000) {
        rate = { started: now, count: 0 };
        rates.set(event, rate);
      }
      return ++rate.count > max;
    };
    const schedule = (
      ack: (result: Extract<CoastAck, { ok: false }>) => void,
      work: () => Promise<void>,
    ) => {
      if (pending >= 4) {
        ack({ ok: false, code: "RATE_LIMITED" });
        return;
      }
      pending++;
      queue = queue
        .then(work)
        .catch(() => ack({ ok: false, code: "UNAVAILABLE" }))
        .finally(() => {
          pending--;
        });
    };
    socket.on("world:join", (raw, ack) => {
      if (typeof ack !== "function") return;
      const parsed = coastJoinSchema.safeParse(raw);
      if (!parsed.success) {
        ack({ ok: false, code: "INVALID_PAYLOAD" });
        return;
      }
      if (limited("join", 2)) {
        ack({ ok: false, code: "RATE_LIMITED" });
        return;
      }
      schedule(ack, async () => {
        if (!socket.connected) return;
        const identity = parsed.data.identityTicket
          ? readCoastIdentity(parsed.data.identityTicket, signingKey)
          : null;
        if (parsed.data.identityTicket && !identity) {
          ack({ ok: false, code: "INVALID_PAYLOAD" });
          return;
        }
        const token =
          membership?.token ??
          parsed.data.resumeToken ??
          randomBytes(32).toString("hex");
        const hash = digest(token),
          id = randomUUID();
        const result = await store.mutate((room, now): CoastJoinAck => {
          const session = joinCoastRoom(
            room,
            socket.id,
            hash,
            id,
            parsed.data.appearance,
            now,
            identity && identity.expiresAt > now ? identity : null,
          );
          if (session === "ROOM_FULL") return { ok: false, code: "ROOM_FULL" };
          return {
            ok: true,
            playerId: session.player.id,
            resumeToken: token,
            snapshot: coastRoomSnapshot(room, now, session.player.id),
          };
        });
        if (result.ok) {
          membership = { id: result.playerId, token };
          members.set(socket.id, result.playerId);
          await socket.join(channel);
        }
        ack(result);
      });
    });
    socket.on("world:input", (raw, ack) => {
      if (typeof ack !== "function") return;
      if (limited("input", 25)) {
        ack({ ok: false, code: "RATE_LIMITED" });
        return;
      }
      const parsed = coastInputSchema.safeParse(raw);
      if (!parsed.success) {
        ack({ ok: false, code: "INVALID_PAYLOAD" });
        return;
      }
      schedule(ack, async () => {
        if (!membership) {
          ack({ ok: false, code: "NOT_JOINED" });
          return;
        }
        const code = await store.mutate((room, now) =>
          applyCoastInput(room, membership!.id, socket.id, parsed.data, now),
        );
        if (code === "SUPERSEDED") {
          membership = null;
          members.delete(socket.id);
          await socket.leave(channel);
        }
        ack(code ? { ok: false, code } : { ok: true });
      });
    });
    socket.on("world:appearance", (raw, ack) => {
      if (typeof ack !== "function") return;
      if (limited("appearance", 5)) {
        ack({ ok: false, code: "RATE_LIMITED" });
        return;
      }
      const parsed = coastAvatarSchema.safeParse(raw);
      if (!parsed.success) {
        ack({ ok: false, code: "INVALID_PAYLOAD" });
        return;
      }
      schedule(ack, async () => {
        if (!membership) {
          ack({ ok: false, code: "NOT_JOINED" });
          return;
        }
        const ok = await store.mutate((room) => {
          const session = room.sessions[membership!.id];
          if (session?.owner !== socket.id) return false;
          session.player.appearance = parsed.data;
          room.revision++;
          return true;
        });
        ack(ok ? { ok: true } : { ok: false, code: "SUPERSEDED" });
      });
    });
    socket.on("world:identity", (raw, ack) => {
      if (typeof ack !== "function") return;
      if (limited("identity", 2)) {
        ack({ ok: false, code: "RATE_LIMITED" });
        return;
      }
      const identity =
        typeof raw === "string" ? readCoastIdentity(raw, signingKey) : null;
      if (raw !== null && !identity) {
        ack({ ok: false, code: "AUTH_REQUIRED" });
        return;
      }
      schedule(ack, async () => {
        const ok = await store.mutate((room, now) => {
          const session = membership ? room.sessions[membership.id] : undefined;
          if (session?.owner !== socket.id) return false;
          session.identity =
            identity && identity.expiresAt > now ? identity : null;
          session.player.name = session.identity?.name ?? null;
          session.player.host = session.identity?.host ?? false;
          room.revision++;
          return true;
        });
        ack(ok ? { ok: true } : { ok: false, code: "NOT_JOINED" });
      });
    });
    socket.on("photo:invite", (raw, ack) => {
      if (typeof ack !== "function") return;
      if (limited("photo-invite", 1)) {
        ack({ ok: false, code: "RATE_LIMITED" });
        return;
      }
      const parsed = coastPhotoInviteSchema.safeParse(raw);
      if (!parsed.success) {
        ack({ ok: false, code: "INVALID_PAYLOAD" });
        return;
      }
      schedule(ack, async () => {
        if (!membership) {
          ack({ ok: false, code: "NOT_JOINED" });
          return;
        }
        const id = randomUUID();
        ack(
          await store.mutate((room, now) => {
            advanceCoastRoom(room, now);
            if (room.sessions[membership!.id]?.owner !== socket.id)
              return { ok: false as const, code: "SUPERSEDED" as const };
            return inviteCoastPhoto(
              room,
              membership!.id,
              parsed.data.target,
              id,
              now,
            );
          }),
        );
      });
    });
    socket.on("photo:respond", (raw, ack) => {
      if (typeof ack !== "function") return;
      if (limited("photo-respond", 4)) {
        ack({ ok: false, code: "RATE_LIMITED" });
        return;
      }
      const parsed = coastPhotoRespondSchema.safeParse(raw);
      if (!parsed.success) {
        ack({ ok: false, code: "INVALID_PAYLOAD" });
        return;
      }
      schedule(ack, async () => {
        if (!membership) {
          ack({ ok: false, code: "NOT_JOINED" });
          return;
        }
        ack(
          await store.mutate((room, now) => {
            advanceCoastRoom(room, now);
            if (room.sessions[membership!.id]?.owner !== socket.id)
              return { ok: false as const, code: "SUPERSEDED" as const };
            return respondCoastPhoto(
              room,
              membership!.id,
              parsed.data.id,
              parsed.data.action,
              now,
            );
          }),
        );
      });
    });
    socket.on("world:receipt", (raw, ack) => {
      if (typeof ack !== "function") return;
      if (limited("receipt", 3)) {
        ack({ ok: false, code: "RATE_LIMITED" });
        return;
      }
      const parsed = coastReceiptRequestSchema.safeParse(raw);
      if (!parsed.success) {
        ack({ ok: false, code: "INVALID_PAYLOAD" });
        return;
      }
      schedule(ack, async () => {
        if (!membership) {
          ack({ ok: false, code: "NOT_JOINED" });
          return;
        }
        ack(
          await store.mutate((room, now) => {
            advanceCoastRoom(room, now);
            const session = room.sessions[membership!.id];
            if (session?.owner !== socket.id)
              return { ok: false as const, code: "SUPERSEDED" as const };
            if (!session.identity || session.identity.expiresAt <= now)
              return { ok: false as const, code: "AUTH_REQUIRED" as const };
            let evidence: Omit<
              CoastReceipt,
              "purpose" | "issuedAt" | "expiresAt" | "day"
            >;
            if ("photoId" in parsed.data) {
              const photo = room.photos?.[parsed.data.photoId];
              if (
                !photo ||
                photo.state !== "complete" ||
                photo.expiresAt <= now ||
                ![photo.from, photo.to].includes(membership!.id) ||
                !photo.composition
              )
                return { ok: false as const, code: "PHOTO_EXPIRED" as const };
              evidence = {
                subject: session.identity.subject,
                source: `photo:${photo.id}`,
                kind: "photo",
                place: "beach",
                withHost: photo.composition.players.some(
                  (p) => p.id !== membership!.id && p.host,
                ),
                companionCount: 1,
                occurredAt: photo.composition.shotAt,
              };
            } else {
              const point = harborPlaces[parsed.data.place];
              if (
                Math.hypot(
                  session.player.x - point.x,
                  session.player.z - point.z,
                ) > 1.8
              )
                return { ok: false as const, code: "OUT_OF_REACH" as const };
              evidence = {
                subject: session.identity.subject,
                source: `visit:${coastDay(now)}:${parsed.data.place}`,
                kind: "visit",
                place: parsed.data.place,
                withHost: false,
                companionCount: Object.values(room.sessions).filter(
                  (s) =>
                    s.owner &&
                    s.player.id !== membership!.id &&
                    Math.hypot(
                      s.player.x - session.player.x,
                      s.player.z - session.player.z,
                    ) < 4,
                ).length,
                occurredAt: now,
              };
            }
            return {
              ok: true as const,
              receipt: issueCoastReceipt(evidence, signingKey, now),
            };
          }),
        );
      });
    });
    const leave = async () => {
      if (membership) {
        const id = membership.id;
        await store.mutate((room) => leaveCoastRoom(room, id, socket.id));
        membership = null;
      }
      members.delete(socket.id);
      await socket.leave(channel);
    };
    socket.on("world:leave", (ack) => {
      if (typeof ack !== "function" || limited("leave", 3)) return;
      schedule(ack, async () => {
        await leave();
        ack({ ok: true });
      });
    });
    socket.on("disconnect", () => {
      members.delete(socket.id);
      // Preserve command order: a late join must be released after it commits.
      queue = queue.then(leave).catch(() => {
        /* Lease expiry cleans up crashed transports. */
      });
    });
  });
  return () => {
    closed = true;
    clearInterval(tick);
  };
}
