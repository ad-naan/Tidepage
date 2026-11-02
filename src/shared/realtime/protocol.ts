import { z } from "zod";

export const REALTIME_VERSION = 1;
export const PRESENCE_TTL_MS = 75_000;
// Restrict embedded icons to small PNGs. Never accept SVG, URLs or local paths.
const iconSchema = z
  .string()
  .max(24_000)
  .regex(/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/);
export const activitySchema = z
  .object({
    id: z.string().min(1).max(80),
    name: z.string().min(1).max(80),
    icon: iconSchema.optional(),
  })
  .strict();
export const trackSchema = z
  .object({
    title: z.string().min(1).max(200),
    artist: z.string().max(200),
    album: z.string().max(200).optional(),
    player: z.string().max(120),
  })
  .strict();
export const presenceUpdateSchema = z
  .object({
    version: z.literal(REALTIME_VERSION),
    sequence: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    status: z.enum(["online", "paused"]),
    apps: z.array(activitySchema).max(12),
    track: trackSchema.nullable(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (new Set(v.apps.map((a) => a.id)).size !== v.apps.length)
      ctx.addIssue({ code: "custom", message: "Duplicate application" });
    if (v.status === "paused" && (v.apps.length || v.track))
      ctx.addIssue({
        code: "custom",
        message: "Paused presence must be empty",
      });
  });
export const presenceSnapshotSchema = z
  .object({
    version: z.literal(REALTIME_VERSION),
    revision: z.number().int().nonnegative(),
    status: z.enum(["online", "paused", "offline"]),
    apps: z.array(activitySchema).max(12),
    track: trackSchema.nullable(),
    updatedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().nonnegative(),
  })
  .strict();
export type PresenceUpdate = z.infer<typeof presenceUpdateSchema>;
export type PresenceSnapshot = z.infer<typeof presenceSnapshotSchema>;
export type RealtimeAck =
  | { ok: true }
  | {
      ok: false;
      code:
        | "INVALID_PAYLOAD"
        | "RATE_LIMITED"
        | "SUPERSEDED"
        | "LEASE_EXPIRED"
        | "UNAVAILABLE";
    };
export interface ServerEvents {
  "author:snapshot": (snapshot: PresenceSnapshot) => void;
}
export interface ClientEvents {
  "author:read": (ack: (snapshot: PresenceSnapshot) => void) => void;
  "author:update": (
    update: PresenceUpdate,
    ack: (result: RealtimeAck) => void,
  ) => void;
}
export function offlineSnapshot(revision = 0): PresenceSnapshot {
  return {
    version: 1,
    revision,
    status: "offline",
    apps: [],
    track: null,
    updatedAt: 0,
    expiresAt: 0,
  };
}
