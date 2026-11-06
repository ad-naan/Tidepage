import type { CoastPhoto, CoastAck } from "@/shared/contracts/coast-space";
import type { CoastRoom } from "./coast-room";

const active = (photo: CoastPhoto) =>
  photo.state === "pending" || photo.state === "scheduled";
export const photoLocksPlayer = (room: CoastRoom, id: string) =>
  Object.values(room.photos ?? {}).some(
    (p) => p.state === "scheduled" && (p.from === id || p.to === id),
  );
export function cancelCoastPhotos(room: CoastRoom, id: string) {
  for (const photo of Object.values(room.photos ?? {}))
    if (active(photo) && (photo.from === id || photo.to === id)) {
      photo.state = "cancelled";
      room.revision++;
    }
}
export function advanceCoastPhotos(room: CoastRoom, now: number) {
  for (const [id, photo] of Object.entries(room.photos ?? {})) {
    if (photo.expiresAt + 120_000 <= now) {
      delete room.photos![id];
      continue;
    }
    if (!active(photo)) continue;
    if (
      photo.expiresAt <= now ||
      !room.sessions[photo.from]?.owner ||
      !room.sessions[photo.to]?.owner
    ) {
      photo.state = "cancelled";
      room.revision++;
      continue;
    }
    if (photo.state === "scheduled" && photo.shootAt! <= now) {
      photo.state = "complete";
      photo.expiresAt = now + 120_000;
      photo.composition = {
        players: [
          room.sessions[photo.from].player,
          room.sessions[photo.to].player,
        ].map((p) => structuredClone(p)),
        night: (photo.shootAt! - room.startedAt) % 1_800_000 >= 1_200_000,
        shotAt: photo.shootAt!,
      };
      room.revision++;
    }
  }
}
export function inviteCoastPhoto(
  room: CoastRoom,
  from: string,
  to: string,
  id: string,
  now: number,
): CoastAck {
  if (from === to || !room.sessions[from]?.owner || !room.sessions[to]?.owner)
    return { ok: false, code: "NOT_JOINED" };
  const a = room.sessions[from].player,
    b = room.sessions[to].player;
  if (Math.hypot(a.x - b.x, a.z - b.z) > 8)
    return { ok: false, code: "OUT_OF_REACH" };
  const photos = Object.values(room.photos ?? {});
  if (
    photos.some(
      (p) =>
        active(p) && [p.from, p.to].some((who) => who === from || who === to),
    )
  )
    return { ok: false, code: "BUSY" };
  if (photos.some((p) => p.from === from && now - p.createdAt < 5000))
    return { ok: false, code: "RATE_LIMITED" };
  room.photos ??= {};
  for (const photo of photos)
    if (!active(photo) && photo.expiresAt <= now) delete room.photos[photo.id];
  if (Object.keys(room.photos).length >= 64) return { ok: false, code: "BUSY" };
  room.photos[id] = {
    id,
    from,
    to,
    state: "pending",
    createdAt: now,
    expiresAt: now + 30_000,
    shootAt: null,
    composition: null,
  };
  room.revision++;
  return { ok: true };
}
export function respondCoastPhoto(
  room: CoastRoom,
  actor: string,
  id: string,
  action: "accept" | "decline" | "cancel",
  now: number,
): CoastAck {
  const photo = room.photos?.[id];
  if (!photo || !active(photo) || photo.expiresAt <= now)
    return { ok: false, code: "PHOTO_EXPIRED" };
  if (
    (action === "cancel" && actor !== photo.from && actor !== photo.to) ||
    (action !== "cancel" && actor !== photo.to)
  )
    return { ok: false, code: "NOT_JOINED" };
  if (action !== "accept") {
    photo.state = action === "decline" ? "declined" : "cancelled";
    room.revision++;
    return { ok: true };
  }
  if (photo.state === "scheduled") return { ok: true };
  if (!room.sessions[photo.from]?.owner || !room.sessions[photo.to]?.owner)
    return { ok: false, code: "NOT_JOINED" };
  photo.state = "scheduled";
  photo.shootAt = now + 4000;
  photo.expiresAt = now + 14_000;
  [photo.from, photo.to].forEach((id, index) => {
    const session = room.sessions[id];
    session.player.x = -5.1 + index * 1.2;
    session.player.z = 3.2;
    session.player.yaw = 0;
    session.player.pose = "wave";
    session.input = {
      sequence: session.sequence,
      direction: { x: 0, z: 0 },
      action: "idle",
    };
  });
  room.revision++;
  return { ok: true };
}
