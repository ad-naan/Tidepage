import { z } from "zod";
import { localeSchema } from "@/shared/i18n/schema";
import { harborDestinations, type HarborDestination } from "./coast-harbor";

export const harborDestinationIds = Object.keys(
  harborDestinations,
) as HarborDestination[];
const destination = z.enum(harborDestinationIds);
export const guideRequestSchema = z
  .object({
    locale: localeSchema,
    companionId: z.literal("otter").default("otter"),
    context: z
      .object({
        night: z.boolean(),
        sailing: z.boolean().optional(),
        lookingSky: z.boolean().optional(),
        following: z.boolean().optional(),
      })
      .strict()
      .optional(),
    place: destination.nullable(),
    turns: z
      .array(
        z
          .object({
            question: z.string().trim().min(1).max(400),
            reply: z.string().max(800),
          })
          .strict(),
      )
      .max(3),
    question: z.string().trim().min(1).max(400),
  })
  .strict();
export const guideAnswerSchema = z
  .object({
    reply: z.string().trim().min(1).max(800),
    destination: destination.nullable(),
    links: z.array(z.number().int().nonnegative()).max(3),
  })
  .strict();
export type GuideAnswer = {
  reply: string;
  destination: HarborDestination | null;
  links: { title: string; href: string }[];
};
