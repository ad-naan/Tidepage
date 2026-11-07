import { z } from "zod";
import { avatarUrlSchema } from "./avatar";

export const coastPlaceSchema = z.enum(["dock", "beach", "bench", "cottage"]);
export const coastIdentitySchema = z
  .object({
    purpose: z.literal("coast-identity"),
    subject: z.uuid(),
    name: z.string().min(1).max(60),
    host: z.boolean(),
    avatarUrl: avatarUrlSchema.nullable().optional(),
    issuedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().nonnegative(),
  })
  .strict();
export type CoastIdentity = z.infer<typeof coastIdentitySchema>;
export const coastReceiptSchema = z
  .object({
    purpose: z.literal("coast-memory"),
    subject: z.uuid(),
    source: z.string().min(1).max(100),
    kind: z.enum(["visit", "photo"]),
    place: coastPlaceSchema,
    withHost: z.boolean(),
    companionCount: z.number().int().min(0).max(11),
    occurredAt: z.number().int().nonnegative(),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    issuedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().nonnegative(),
  })
  .strict();
export type CoastReceipt = z.infer<typeof coastReceiptSchema>;
export type CoastMemory = {
  id: string;
  kind: "visit" | "photo";
  place: z.infer<typeof coastPlaceSchema>;
  day: string;
  withHost: boolean;
  companionCount: number;
  occurredAt: string;
};
export type CoastMemoryPage = { items: CoastMemory[]; next: string | null };
export type CoastIdentityTicket = { ticket: string };
export const saveCoastMemorySchema = z
  .object({ receipt: z.string().min(1).max(4096) })
  .strict();
export const coastMemoryQuerySchema = z
  .object({ after: z.uuid().optional() })
  .strict();
