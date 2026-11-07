import { z } from "zod";

export const publicationReviewTools = [
  "read_draft",
  "search_articles",
  "check_seo",
  "preview_rss",
] as const;
export const publicationReviewReport = z
  .object({
    summary: z.string().trim().min(1).max(600),
    suggestions: z
      .array(
        z
          .object({
            priority: z.enum(["high", "medium", "low"]),
            observation: z.string().trim().min(1).max(450),
            recommendation: z.string().trim().min(1).max(700),
            evidence: z
              .array(z.string().regex(/^E[1-9]\d?$/))
              .min(1)
              .max(4),
          })
          .strict(),
      )
      .max(6),
  })
  .strict();

export type PublicationReview = {
  revision: number;
  report: z.infer<typeof publicationReviewReport>;
  evidence: {
    id: string;
    tool: string;
    facts: { label: string; value: string }[];
    links?: { title: string; href: string }[];
  }[];
};
