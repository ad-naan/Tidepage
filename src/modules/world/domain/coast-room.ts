import type {
  CoastAppearance,
  CoastInput,
  CoastPlayer,
  CoastSnapshot,
  CoastErrorCode,
  CoastPhoto,
  CoastSpeech,
} from "@/shared/contracts/coast-space";
import type { CoastIdentity } from "@/shared/contracts/coast-memories";
import {
  advanceCoastPhotos,
  cancelCoastPhotos,
  photoLocksPlayer,
} from "./coast-photo";
import {
  harborSeating,
  harborStandingPoint,
  harborWalkable,
  HARBOR_WALK_SPEED,
  HARBOR_RUN_SPEED,
  HARBOR_SAIL_SPEED,
  harborMooring,
  harborLanding,
} from "./coast-harbor";
import { harborSailable } from "./harbor-terrain";
import { nearbyCoastSpeech, pruneCoastSpeech } from "./coast-speech";

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
  jumpUntil?: number;
  sequence: number;
  input: CoastInput;
  player: CoastPlayer;
};
export type CoastRoom = {
  speech?: CoastSpeech[];
  speechRates?: Record<string, number[]>;
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
      if (
        session.player.host ||
        session.player.name ||
        session.player.avatarUrl
      )
        room.revision++;
      session.player.host = false;
      session.player.name = null;
      session.player.avatarUrl = null;
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
      const sailing = p.travel === "sail";
      const traversable = sailing ? harborSailable : harborWalkable;
      const speed = sailing
        ? HARBOR_SAIL_SPEED
        : input.running
          ? HARBOR_RUN_SPEED
          : HARBOR_WALK_SPEED;
      const steps = Math.max(1, Math.ceil((speed * delta) / 0.08));
      let moved = false;
      for (let step = 0; step < steps; step++) {
        const x = p.x + (input.direction.x * speed * delta) / steps;
        const z = p.z + (input.direction.z * speed * delta) / steps;
        if (traversable(x, z)) {
          p.x = x;
          p.z = z;
          moved = true;
        } else if (traversable(x, p.z)) {
          p.x = x;
          moved = true;
        } else if (traversable(p.x, z)) {
          p.z = z;
          moved = true;
        } else break;
      }
      p.yaw = Math.atan2(input.direction.x, input.direction.z);
      p.pose = sailing
        ? "idle"
        : moved
          ? input.running
            ? "run"
            : "walk"
          : "idle";
      if (sailing) p.boat = { x: p.x, z: p.z };
    } else p.pose = session.waveUntil > now ? "wave" : "idle";
    if ((session.jumpUntil ?? 0) > now) p.pose = "jump";
    if (previous !== `${p.x},${p.z},${p.yaw},${p.pose}`) room.revision++;
  }
  advanceCoastPhotos(room, now);
  pruneCoastSpeech(room, now);
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
        travel: "walk",
        boat: { ...harborMooring },
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
  session.player.avatarUrl = identity?.avatarUrl ?? null;
  session.player.host = identity?.host ?? false;
  cancelCoastPhotos(room, session.player.id);
  session.player.appearance = appearance;
  session.player.travel ??= "walk";
  session.player.boat ??= { ...harborMooring };
  if (session.player.pose === "sit") {
    Object.assign(session.player, harborStandingPoint(session.player));
  }
  session.player.pose = "idle";
  session.seenAt = now;
  session.steppedAt = now;
  session.expiresAt = now + COAST_RESUME_MS;
  session.sequence = -1;
  session.waveUntil = 0;
  session.jumpUntil = 0;
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
  if (input.travel && input.travel !== (p.travel ?? "walk")) {
    const boat = p.boat ?? harborMooring;
    if (input.travel === "sail") {
      if (
        Math.hypot(p.x - boat.x, p.z - boat.z) > 3.2 ||
        !harborSailable(boat.x, boat.z)
      )
        return "OUT_OF_REACH";
      Object.assign(p, boat);
    } else {
      const landing = harborLanding(p);
      if (!landing) return "OUT_OF_REACH";
      p.boat = { x: p.x, z: p.z };
      Object.assign(p, landing);
    }
    p.travel = input.travel;
    p.pose = "idle";
    session.jumpUntil = 0;
    session.waveUntil = 0;
    room.revision++;
  }
  if (
    p.travel === "sail" &&
    (input.action === "sit" || input.action === "jump")
  )
    return "OUT_OF_REACH";
  if (input.action === "sit" && p.pose !== "sit") {
    const seating = harborSeating.find(
      (group) =>
        Math.hypot(p.x - group.approach.x, p.z - group.approach.z) < 1.6,
    );
    if (!seating) return "OUT_OF_REACH";
    const seat = seating.seats.find((point) =>
      Object.values(room.sessions).every(
        (s) =>
          !s.owner ||
          s.player.id === id ||
          s.player.pose !== "sit" ||
          Math.hypot(s.player.x - point.x, s.player.z - point.z) > 0.4,
      ),
    );
    if (!seat) return "SEAT_TAKEN";
    p.x = seat.x;
    p.z = seat.z;
    p.yaw = seating.yaw;
    p.pose = "sit";
  } else if (input.action !== "sit" && p.pose === "sit") {
    Object.assign(p, harborStandingPoint(p));
    p.pose = "idle";
  }
  if (input.action === "wave" && session.input.action !== "wave")
    session.waveUntil = now + 2500;
  if (
    input.action === "jump" &&
    session.input.action !== "jump" &&
    (session.jumpUntil ?? 0) <= now &&
    p.pose !== "sit"
  )
    session.jumpUntil = now + 750;
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
  if (room.speech) room.speech = room.speech.filter(line=>line.playerId!==id);
  cancelCoastPhotos(room, id);
  session.input = idleInput();
  room.revision++;
}

export function coastRoomSnapshot(
  room: CoastRoom,
  now: number,
  viewerId?: string,
  includeSpeech = false,
): CoastSnapshot {
  return {
    ...(includeSpeech
      ? { speech: nearbyCoastSpeech(room, viewerId, now) }
      : {}),
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
