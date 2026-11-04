import { z } from "zod";
import { localeSchema } from "@/shared/i18n/schema";
import { engagementTargetSchema, type EngagementTarget } from "./target";
export const interactionKindSchema = z.enum(["like", "save"]);
export type InteractionKind = z.infer<typeof interactionKindSchema>;
export const interactionQuerySchema = z
  .object({
    type: engagementTargetSchema.shape.type,
    ids: z.array(engagementTargetSchema.shape.id).min(1).max(100),
    locale: localeSchema,
  })
  .strict();
export const interactionChangeSchema = z
  .object({
    target: engagementTargetSchema,
    locale: localeSchema,
    kind: interactionKindSchema,
    active: z.boolean(),
  })
  .strict();
export type InteractionState = {
  target: EngagementTarget;
  likeCount: number;
  liked: boolean;
  saved: boolean;
};
