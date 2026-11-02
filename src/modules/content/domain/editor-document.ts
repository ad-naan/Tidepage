import { z } from "zod";
import { locales, type Locale } from "@/shared/i18n/config";
import { categorySchema, sketchSchema } from "./taxonomy";

export const safeWebUrl = z.url({ protocol: /^https?$/ }).refine((value) => {
  try {
    const parsed = new URL(value);
    return !parsed.username && !parsed.password;
  } catch {
    return false;
  }
});
export const embedSchema = z.object({
  kind: z.enum(["web", "movie", "music"]),
  title: z.string().trim().min(1).max(200),
  url: safeWebUrl,
  description: z.string().max(2000).default(""),
  creator: z.string().max(200).default(""),
  year: z
    .string()
    .regex(/^$|^\d{4}$/)
    .default(""),
  artworkAssetId: z.string().default(""),
  originalTitle: z.string().max(200).optional(),
  siteName: z.string().max(80).optional(),
  artworkUrl: z
    .string()
    .refine(
      (value) =>
        !value ||
        /^\/(?!\/)[^\\]*$/.test(value) ||
        safeWebUrl.safeParse(value).success,
    )
    .optional(),
  artworkAlt: z.string().max(300).optional(),
  album: z.string().max(200).optional(),
});
export type Embed = z.infer<typeof embedSchema>;
export type EditorNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: EditorNode[];
};
const supportedNodes = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "blockquote",
  "callout",
  "codeBlock",
  "horizontalRule",
  "hardBreak",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
  "referenceCard",
  "assetImage",
]);
const supportedMarks = new Set([
  "bold",
  "italic",
  "strike",
  "code",
  "link",
  "underline",
]);
/** Bound depth/size before walking; reject unsupported nodes rather than dropping content. */
export function isEditorDocument(value: unknown): value is EditorNode {
  let count = 0;
  function valid(node: unknown, depth: number): boolean {
    if (++count > 20000 || depth > 32 || !node || typeof node !== "object")
      return false;
    const n = node as EditorNode;
    if (!supportedNodes.has(n.type)) return false;
    if (
      n.text !== undefined &&
      (typeof n.text !== "string" || n.text.length > 200000)
    )
      return false;
    if (n.type === "referenceCard" && !embedSchema.safeParse(n.attrs).success)
      return false;
    if (
      n.type === "assetImage" &&
      (typeof n.attrs?.assetId !== "string" || !n.attrs.assetId)
    )
      return false;
    if (
      n.marks &&
      (!Array.isArray(n.marks) ||
        n.marks.some(
          (mark) =>
            !supportedMarks.has(mark.type) ||
            (mark.type === "link" &&
              !safeWebUrl.safeParse(mark.attrs?.href).success),
        ))
    )
      return false;
    return (
      !n.content ||
      (Array.isArray(n.content) &&
        n.content.every((child) => valid(child, depth + 1)))
    );
  }
  try {
    return (
      JSON.stringify(value).length <= 2_000_000 &&
      (value as EditorNode)?.type === "doc" &&
      valid(value, 0)
    );
  } catch {
    return false;
  }
}
export const editorDocumentSchema = z.custom<EditorNode>(isEditorDocument);
export const emptyDocument = (): EditorNode => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});
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
    author: "adnaan",
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
export function documentText(node: EditorNode): string {
  return (
    node.text ??
    node.content
      ?.map(documentText)
      .join(node.type === "paragraph" || node.type === "heading" ? "" : "\n") ??
    ""
  );
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
  if (article.publishedAt && Number.isNaN(Date.parse(article.publishedAt)))
    issues.push("publishedAt");
  return issues;
}
