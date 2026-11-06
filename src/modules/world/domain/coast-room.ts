import type {
  CoastAppearance,
  CoastInput,
  CoastPlayer,
  CoastSnapshot,
  CoastErrorCode,
  CoastPhoto,
} from "@/shared/contracts/coast-space";
import type { CoastIdentity } from "@/shared/contracts/coast-memories";
import {
  advanceCoastPhotos,
  cancelCoastPhotos,
  photoLocksPlayer,
} from "./coast-photo";
import {
  harborPlaces,
  harborSeats,
  harborWalkable,
  HARBOR_WALK_SPEED,
} from "./coast-harbor";

export const COAST_CAPACITY = 12;
export const COAST_PRESENCE_MS = 15_000;
export const COAST_RESUME_MS = 30 * 60_000;
export type CoastSession = {
  identity?: CoastIdentity | null;
  tokenHash: string;
  owner: string | null;
  expiresAt: number;
  seenAt: number;
  steppedAt: number;
  waveUntil: number;
  sequence: number;
  input: CoastInput;
  player: CoastPlayer;
};
export type CoastRoom = {
  photos?: Record<string, CoastPhoto>;
  revision: number;
  startedAt: number;
  sessions: Record<string, CoastSession>;
};
export const emptyCoastRoom = (now: number): CoastRoom => ({
  revision: 0,
  startedAt: now,
  sessions: {},
});
const idleInput = (): CoastInput => ({
  sequence: 0,
  direction: { x: 0, z: 0 },
  action: "idle",
});

export function advanceCoastRoom(room: CoastRoom, now: number) {
  for (const [id, session] of Object.entries(room.sessions)) {
    if (session.expiresAt <= now) {
      delete room.sessions[id];
      room.revision++;
      continue;
    }
    if (!session.owner) continue;
    if (!session.identity || session.identity.expiresAt <= now) {
      if (session.player.host || session.player.name) room.revision++;
      session.player.host = false;
      session.player.name = null;
    }
    if (now - session.seenAt >= COAST_PRESENCE_MS) {
      session.owner = null;
      session.input = idleInput();
      room.revision++;
      continue;
    }
    const p = session.player,
      previous = `${p.x},${p.z},${p.yaw},${p.pose}`;
    const delta = Math.min(Math.max(0, now - session.steppedAt), 250) / 1000;
    session.steppedAt = Math.max(session.steppedAt, now);
    const input = session.input;
    if (p.pose === "sit" || photoLocksPlayer(room, id)) continue;
    const moving =
      now - session.seenAt < 600 &&
      Math.hypot(input.direction.x, input.direction.z) > 0.001;
    if (moving) {
      const steps = Math.max(1, Math.ceil((HARBOR_WALK_SPEED * delta) / 0.08));
      let moved = false;
      for (let step = 0; step < steps; step++) {
        const x = p.x + (input.direction.x * HARBOR_WALK_SPEED * delta) / steps;
        const z = p.z + (input.direction.z * HARBOR_WALK_SPEED * delta) / steps;
        if (!harborWalkable(x, z)) break;
        p.x = x;
        p.z = z;
        moved = true;
      }
      p.yaw = Math.atan2(input.direction.x, input.direction.z);
      p.pose = moved ? "walk" : "idle";
    } else p.pose = session.waveUntil > now ? "wave" : "idle";
    if (previous !== `${p.x},${p.z},${p.yaw},${p.pose}`) room.revision++;
  }
  advanceCoastPhotos(room, now);
}

export function joinCoastRoom(
  room: CoastRoom,
  owner: string,
  tokenHash: string,
  newId: string,
  appearance: CoastAppearance,
  now: number,
  identity: CoastIdentity | null = null,
): CoastSession | "ROOM_FULL" {
  advanceCoastRoom(room, now);
  const sessions = Object.values(room.sessions);
  let session = sessions.find((s) => s.tokenHash === tokenHash);
  if (
    !session?.owner &&
    sessions.filter((s) => s.owner).length >= COAST_CAPACITY
  )
    return "ROOM_FULL";
  if (!session) {
    const occupied = sessions.filter((s) => s.owner);
    const spawn = Array.from({ length: COAST_CAPACITY }, (_, i) => ({
      x: -2 + (i % 4) * 1.3,
      z: 2 + Math.floor(i / 4) * 1.2,
    })).find((point) =>
      occupied.every(
        (s) => Math.hypot(s.player.x - point.x, s.player.z - point.z) > 0.75,
      ),
    ) ?? { x: 0, z: 4 };
    session = {
      tokenHash,
      owner,
      expiresAt: now + COAST_RESUME_MS,
      seenAt: now,
      steppedAt: now,
      sequence: -1,
      waveUntil: 0,
      input: idleInput(),
      player: {
        id: newId,
        appearance,
        ...spawn,
        yaw: 0.3,
        pose: "idle",
        name: null,
        host: false,
      },
    };
    room.sessions[newId] = session;
    // Bound retained anonymous sessions independently of the online capacity.
    const offline = Object.entries(room.sessions)
      .filter(([, s]) => !s.owner)
      .sort((a, b) => a[1].seenAt - b[1].seenAt);
    while (Object.keys(room.sessions).length > 256 && offline.length)
      delete room.sessions[offline.shift()![0]];
  }
  session.owner = owner;
  session.identity = identity;
  session.player.name = identity?.name ?? null;
  session.player.host = identity?.host ?? false;
  cancelCoastPhotos(room, session.player.id);
  session.player.appearance = appearance;
  if (session.player.pose === "sit") {
    session.player.z = harborPlaces.bench.z;
  }
  session.player.pose = "idle";
  session.seenAt = now;
  session.steppedAt = now;
  session.expiresAt = now + COAST_RESUME_MS;
  session.sequence = -1;
  session.waveUntil = 0;
  session.input = idleInput();
  room.revision++;
  return session;
}

export function applyCoastInput(
  room: CoastRoom,
  id: string,
  owner: string,
  input: CoastInput,
  now: number,
): CoastErrorCode | null {
  advanceCoastRoom(room, now);
  const session = room.sessions[id];
  if (!session?.owner) return "NOT_JOINED";
  if (session.owner !== owner) return "SUPERSEDED";
  if (input.sequence <= session.sequence) return null;
  if (photoLocksPlayer(room, id)) {
    session.sequence = input.sequence;
    session.seenAt = now;
    session.expiresAt = now + COAST_RESUME_MS;
    return null;
  }
  const p = session.player;
  if (input.action === "sit" && p.pose !== "sit") {
    if (
      Math.hypot(p.x - harborPlaces.bench.x, p.z - harborPlaces.bench.z) > 1.6
    )
      return "OUT_OF_REACH";
    const seat = harborSeats.find((point) =>
      Object.values(room.sessions).every(
        (s) =>
          !s.owner ||
          s.player.id === id ||
          s.player.pose !== "sit" ||
          Math.abs(s.player.x - point.x) > 0.4,
      ),
    );
    if (!seat) return "SEAT_TAKEN";
    p.x = seat.x;
    p.z = seat.z;
    p.yaw = 0;
    p.pose = "sit";
  } else if (input.action !== "sit" && p.pose === "sit") {
    p.z = harborPlaces.bench.z;
    p.pose = "idle";
  }
  if (input.action === "wave" && session.input.action !== "wave")
    session.waveUntil = now + 2500;
  if (input.action === "idle") session.waveUntil = 0;
  session.sequence = input.sequence;
  session.input = input;
  session.seenAt = now;
  session.expiresAt = now + COAST_RESUME_MS;
  room.revision++;
  return null;
}

export function leaveCoastRoom(room: CoastRoom, id: string, owner: string) {
  const session = room.sessions[id];
  if (session?.owner !== owner) return;
  session.owner = null;
  cancelCoastPhotos(room, id);
  session.input = idleInput();
  room.revision++;
}

export function coastRoomSnapshot(
  room: CoastRoom,
  now: number,
  viewerId?: string,
): CoastSnapshot {
  return {
    version: 1,
    room: "sunset",
    revision: room.revision,
    serverTime: now,
    night: (now - room.startedAt) % 1_800_000 >= 1_200_000,
    photo:
      Object.values(room.photos ?? {})
        .filter(
          (p) =>
            (p.from === viewerId || p.to === viewerId) && p.expiresAt > now,
        )
        .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null,
    players: Object.values(room.sessions)
      .filter((s) => s.owner && now - s.seenAt < COAST_PRESENCE_MS)
      .map((s) => structuredClone(s.player)),
  };
}
