import {
  COAST_SPEECH_MS,
  COAST_SPEECH_RADIUS,
  type CoastErrorCode,
  type CoastSpeech,
} from "@/shared/contracts/coast-space";
import type { CoastRoom } from "./coast-room";

export function pruneCoastSpeech(room: CoastRoom, now: number) {
  if (room.speech)
    room.speech = room.speech.filter(
      (line) => line.expiresAt > now && room.sessions[line.playerId]?.owner,
    );
  for (const [subject, times] of Object.entries(room.speechRates ?? {})) {
    const recent = times.filter((time) => time > now - 10_000);
    if (recent.length) room.speechRates![subject] = recent;
    else delete room.speechRates![subject];
  }
}

/** Identity, location and audience come from the authoritative room, never the payload. */
export function sayInCoastRoom(
  room: CoastRoom,
  playerId: string,
  owner: string,
  input: { id: string; text: string },
  now: number,
): CoastErrorCode | null {
  const session = room.sessions[playerId];
  if (!session?.owner) return "NOT_JOINED";
  if (session.owner !== owner) return "SUPERSEDED";
  if (!session.identity || session.identity.expiresAt <= now)
    return "AUTH_REQUIRED";
  pruneCoastSpeech(room, now);
  const duplicate = room.speech?.find((line) => line.id === input.id);
  if (duplicate)
    return duplicate.playerId === playerId && duplicate.text === input.text
      ? null
      : "INVALID_PAYLOAD";
  const rates = (room.speechRates ??= {});
  const recent = rates[session.identity.subject] ?? [];
  if (recent.length >= 3) return "RATE_LIMITED";
  rates[session.identity.subject] = [...recent, now];
  room.speech = [
    ...(room.speech ?? []).filter((line) => line.playerId !== playerId),
    {
      ...input,
      playerId,
      x: session.player.x,
      z: session.player.z,
      createdAt: now,
      expiresAt: now + COAST_SPEECH_MS,
    },
  ].slice(-12);
  room.revision++;
  return null;
}

export function nearbyCoastSpeech(
  room: CoastRoom,
  viewerId: string | undefined,
  now: number,
): CoastSpeech[] {
  const viewer = viewerId ? room.sessions[viewerId] : undefined;
  if (!viewer?.owner) return [];
  return (room.speech ?? [])
    .filter((line) => {
      const speaker = room.sessions[line.playerId];
      return (
        line.expiresAt > now &&
        speaker?.owner &&
        Math.hypot(line.x - viewer.player.x, line.z - viewer.player.z) <=
          COAST_SPEECH_RADIUS &&
        Math.hypot(
          speaker.player.x - viewer.player.x,
          speaker.player.z - viewer.player.z,
        ) <= COAST_SPEECH_RADIUS
      );
    })
    .map((line) => ({ ...line }));
}
