import { z } from "zod";
import { coastPlaceSchema } from "./coast-memories";

export const coastAvatarSchema = z
  .object({
    version: z.literal(1),
    coat: z.enum(["sea", "moss", "coral", "cream"]),
    skin: z.enum(["light", "warm", "deep"]),
    hairColor: z.enum(["chestnut", "ink", "honey"]),
    hairStyle: z.enum(["crop", "bob", "waves"]),
    accessory: z.enum(["satchel", "scarf", "none"]),
  })
  .strict();
export type CoastAppearance = z.infer<typeof coastAvatarSchema>;
export const coastPoseSchema = z.enum(["idle", "walk", "sit", "wave"]);
export type CoastPose = z.infer<typeof coastPoseSchema>;
export const coastJoinSchema = z
  .object({
    version: z.literal(1),
    appearance: coastAvatarSchema,
    identityTicket: z.string().min(1).max(4096).optional(),
    resumeToken: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();
export const coastInputSchema = z
  .object({
    sequence: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    direction: z
      .object({ x: z.number().min(-1).max(1), z: z.number().min(-1).max(1) })
      .strict()
      .refine((d) => Math.hypot(d.x, d.z) <= 1.001),
    action: z.enum(["idle", "wave", "sit"]),
  })
  .strict();
export type CoastInput = z.infer<typeof coastInputSchema>;
export type CoastIntent = Omit<CoastInput, "sequence">;
export const coastPlayerSchema = z
  .object({
    id: z.uuid(),
    appearance: coastAvatarSchema,
    x: z.number().min(-20).max(20),
    z: z.number().min(-20).max(20),
    yaw: z.number().min(-Math.PI).max(Math.PI),
    pose: coastPoseSchema,
    name: z.string().min(1).max(60).nullable().default(null),
    host: z.boolean().default(false),
  })
  .strict();
export type CoastPlayer = z.infer<typeof coastPlayerSchema>;
export const coastPhotoSchema = z
  .object({
    id: z.uuid(),
    from: z.uuid(),
    to: z.uuid(),
    state: z.enum([
      "pending",
      "scheduled",
      "complete",
      "declined",
      "cancelled",
    ]),
    createdAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().nonnegative(),
    shootAt: z.number().int().nonnegative().nullable(),
    composition: z
      .object({
        players: z.array(coastPlayerSchema).length(2),
        night: z.boolean(),
        shotAt: z.number().int().nonnegative(),
      })
      .strict()
      .nullable(),
  })
  .strict();
export type CoastPhoto = z.infer<typeof coastPhotoSchema>;
export type CoastPhotoComposition = NonNullable<CoastPhoto["composition"]>;
export const coastPhotoInviteSchema = z.object({ target: z.uuid() }).strict();
export const coastPhotoRespondSchema = z
  .object({ id: z.uuid(), action: z.enum(["accept", "decline", "cancel"]) })
  .strict();
export const coastReceiptRequestSchema = z.union([
  z.object({ place: coastPlaceSchema }).strict(),
  z.object({ photoId: z.uuid() }).strict(),
]);
export const coastSnapshotSchema = z
  .object({
    version: z.literal(1),
    room: z.literal("sunset"),
    revision: z.number().int().nonnegative(),
    serverTime: z.number().int().nonnegative(),
    night: z.boolean(),
    players: z.array(coastPlayerSchema).max(12),
    photo: coastPhotoSchema.nullable().default(null),
  })
  .strict();
export type CoastSnapshot = z.infer<typeof coastSnapshotSchema>;
export type CoastErrorCode =
  | "INVALID_PAYLOAD"
  | "RATE_LIMITED"
  | "ROOM_FULL"
  | "SUPERSEDED"
  | "UNAVAILABLE"
  | "NOT_JOINED"
  | "OUT_OF_REACH"
  | "SEAT_TAKEN"
  | "AUTH_REQUIRED"
  | "BUSY"
  | "PHOTO_EXPIRED";
export type CoastSocialError = "AUTH_REQUIRED" | "BUSY" | "PHOTO_EXPIRED";
export type CoastAck =
  { ok: true } | { ok: false; code: CoastErrorCode | CoastSocialError };
export type CoastReceiptAck =
  | { ok: true; receipt: string }
  | { ok: false; code: CoastErrorCode | CoastSocialError };
export type CoastJoinAck =
  | { ok: true; playerId: string; resumeToken: string; snapshot: CoastSnapshot }
  | { ok: false; code: CoastErrorCode };
export interface CoastClientEvents {
  "world:identity": (
    ticket: string | null,
    ack: (result: CoastAck) => void,
  ) => void;
  "photo:invite": (
    request: { target: string },
    ack: (result: CoastAck) => void,
  ) => void;
  "photo:respond": (
    request: { id: string; action: "accept" | "decline" | "cancel" },
    ack: (result: CoastAck) => void,
  ) => void;
  "world:receipt": (
    request:
      { place: "dock" | "beach" | "bench" | "cottage" } | { photoId: string },
    ack: (result: CoastReceiptAck) => void,
  ) => void;
  "world:join": (
    request: z.infer<typeof coastJoinSchema>,
    ack: (result: CoastJoinAck) => void,
  ) => void;
  "world:input": (input: CoastInput, ack: (result: CoastAck) => void) => void;
  "world:appearance": (
    appearance: CoastAppearance,
    ack: (result: CoastAck) => void,
  ) => void;
  "world:leave": (ack: (result: CoastAck) => void) => void;
}
export interface CoastServerEvents {
  "world:snapshot": (snapshot: CoastSnapshot) => void;
}
