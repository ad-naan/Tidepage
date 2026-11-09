import { z } from "zod";
import { localeSchema } from "@/shared/i18n/schema";

export const articleContextLimit = 16_000;
export const translationTextLimit = 80_000;
export const translationSegmentLimit = 2_048;
export const editorialTimeoutMs = 240_000;
const text = (max: number) => z.string().trim().min(1).max(max);
export const writingRequestSchema = z.discriminatedUnion("task", [
  z
    .object({
      task: z.literal("write"),
      locale: localeSchema,
      prompt: text(2000),
      context: z.string().max(articleContextLimit),
      selection: z.string().max(articleContextLimit),
    })
    .strict(),
  z
    .object({
      task: z.literal("metadata"),
      locale: localeSchema,
      title: z.string().max(200),
      context: text(articleContextLimit),
    })
    .strict(),
  z
    .object({
      task: z.literal("translate"),
      locale: localeSchema,
      sourceLocale: localeSchema,
      segments: z
        .array(z.string().min(1).max(translationTextLimit))
        .min(1)
        .max(translationSegmentLimit),
    })
    .strict()
    .refine(
      (input) =>
        input.locale !== input.sourceLocale &&
        input.segments.reduce((total, value) => total + value.length, 0) <=
          translationTextLimit,
    ),
  z
    .object({
      task: z.literal("site"),
      locale: localeSchema,
      name: text(200),
      description: z.string().max(2000),
      context: z.string().max(6000),
    })
    .strict(),
]);
export const metadataSuggestionSchema = z
  .object({
    title: text(200),
    excerpt: text(1200),
    seoTitle: text(200),
    seoDescription: text(1200),
    tags: z.array(text(60)).max(12),
    review: z.array(text(300)).max(5),
  })
  .strict();
export const siteSuggestionSchema = z
  .object({
    seoTitle: text(200),
    seoDescription: text(1200),
    review: z.array(text(300)).max(5),
  })
  .strict();
export type MetadataSuggestion = z.infer<typeof metadataSuggestionSchema>;
export type SiteSuggestion = z.infer<typeof siteSuggestionSchema>;
export type EditorialRequest = z.infer<typeof writingRequestSchema>;
export type WritingRequest = {
  prompt: string;
  locale: z.infer<typeof localeSchema>;
  context: string;
  selection: string;
};
export type WritingEvent = { type: "delta"; text: string } | { type: "done" };
export interface WritingAgent {
  stream(
    input: WritingRequest,
    signal: AbortSignal,
  ): AsyncIterable<WritingEvent>;
}
