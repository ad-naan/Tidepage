import { z } from "zod";
export const engagementTargetSchema = z
  .object({
    type: z.enum(["article", "note", "project", "page"]),
    id: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-zA-Z0-9_-]+$/),
  })
  .strict();
export type EngagementTarget = z.infer<typeof engagementTargetSchema>;
export const targetKey = (target: EngagementTarget) =>
  `${target.type}:${target.id}`;
