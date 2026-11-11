import { z } from "zod";
import { diagramSchema } from "@/shared/contracts/diagram";
import { localeSchema } from "@/shared/i18n/schema";

export const diagramRequestSchema = z
  .object({
    locale: localeSchema,
    prompt: z.string().trim().min(1).max(2000),
    context: z.string().max(16000),
    diagram: diagramSchema.optional(),
  })
  .strict();
export type DiagramRequest = z.infer<typeof diagramRequestSchema>;
export const diagramEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("status"), phase: z.literal("generating") }),
  z.object({ type: z.literal("progress"), diagram: diagramSchema }),
  z.object({ type: z.literal("done"), diagram: diagramSchema }),
  z.object({ type: z.literal("error") }),
]);
export type DiagramEvent = z.infer<typeof diagramEventSchema>;
