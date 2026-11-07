import { z } from "zod";
import { locales, type Locale } from "@/shared/i18n/config";
import { categorySchema, sketchSchema } from "./taxonomy";
import { profile } from "@/shared/config/profile";
import { parseSiteDateTime } from "@/shared/lib/date-time";

import {
  editorDocumentSchema,
  emptyDocument,
  documentText,
  type EditorNode,
} from "@/shared/contracts/rich-text";
export {
  safeWebUrl,
  embedSchema,
  editorDocumentSchema,
  isEditorDocument,
  emptyDocument,
  documentText,
  type EditorNode,
  type Embed,
} from "@/shared/contracts/rich-text";
export const articleTranslationSchema = z.object({
  title: z.string().max(200),
  slug: z
    .string()
    .max(120)
    .regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: z.string().max(1200),
  body: editorDocumentSchema,
  seoTitle: z.string().max(200),
  seoDescription: z.string().max(1200),
  coverAlt: z.string().max(300),
  tags: z.array(z.string().max(60)).max(30),
});
export type ArticleTranslation = z.infer<typeof articleTranslationSchema>;
export const articleDraftSchema = z.object({
  schemaVersion: z.literal(1),
  deletedAt: z.iso.datetime().optional(),
  id: z.string().min(1),
  revision: z.number().int().min(0),
  author: z.string().max(100),
  category: categorySchema,
  sketch: sketchSchema,
  coverAssetId: z.string(),
  publishedAt: z.string(),
  minutes: z.number().int().min(1).max(1000),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  translations: z.record(z.string(), articleTranslationSchema),
});
export type ArticleDraft = z.infer<typeof articleDraftSchema>;
export function emptyTranslation(): ArticleTranslation {
  return {
    title: "",
    slug: "",
    excerpt: "",
    body: emptyDocument(),
    seoTitle: "",
    seoDescription: "",
    coverAlt: "",
    tags: [],
  };
}
export function newArticle(
  id: string,
  now = new Date().toISOString(),
): ArticleDraft {
  return {
    schemaVersion: 1,
    id,
    revision: 0,
    author: profile.name,
    category: "technology",
    sketch: "boat",
    coverAssetId: "",
    publishedAt: "",
    minutes: 1,
    createdAt: now,
    updatedAt: now,
    translations: Object.fromEntries(
      locales.map((locale) => [locale, emptyTranslation()]),
    ),
  };
}
export function translationOf(
  article: ArticleDraft,
  locale: Locale,
): ArticleTranslation {
  return article.translations[locale] ?? emptyTranslation();
}
export function publicationIssues(article: ArticleDraft, locale: Locale) {
  const value = translationOf(article, locale);
  const issues: string[] = [];
  if (!value.title.trim()) issues.push("title");
  if (!value.slug.trim()) issues.push("slug");
  if (
    !documentText(value.body).trim() &&
    !value.body.content?.some((n) =>
      ["assetImage", "referenceCard"].includes(n.type),
    )
  )
    issues.push("body");
  if (article.coverAssetId && !value.coverAlt.trim()) issues.push("coverAlt");
  let missingAlt = false;
  const inspect = (node: EditorNode) => {
    if (node.type === "assetImage" && !String(node.attrs?.alt ?? "").trim())
      missingAlt = true;
    node.content?.forEach(inspect);
  };
  inspect(value.body);
  if (missingAlt) issues.push("imageAlt");
  if (article.publishedAt && !parseSiteDateTime(article.publishedAt))
    issues.push("publishedAt");
  return issues;
}
