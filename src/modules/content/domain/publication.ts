import { z } from "zod";
import { localeSchema } from "@/shared/i18n/schema";
import { parseSiteDateTime } from "@/shared/lib/date-time";
import type { Article } from "./models";
import type { ArticleTranslation } from "./editor-document";

export const publicationRequestSchema = z
  .object({
    id: z.string().min(1).max(128),
    locale: localeSchema,
    revision: z.number().int().positive(),
  })
  .strict();
export type PublicationRequest = z.infer<typeof publicationRequestSchema>;

export function publicationCopy(translation: ArticleTranslation) {
  const { title, excerpt, seoTitle, seoDescription } = translation;
  return {
    title: title.trim(),
    excerpt: excerpt.trim(),
    seoTitle: seoTitle.trim(),
    seoDescription: seoDescription.trim(),
  };
}

export function articleSeoCopy(
  article: Pick<Article, "title" | "excerpt"> & {
    publication?: Pick<
      NonNullable<Article["publication"]>,
      "seoTitle" | "seoDescription"
    >;
  },
) {
  return {
    title: article.publication?.seoTitle || article.title,
    description: article.publication?.seoDescription || article.excerpt,
  };
}

export function publicationDate(
  value: string,
  previous: Date | null | undefined,
  now: Date,
) {
  return value ? parseSiteDateTime(value) : (previous ?? now);
}
