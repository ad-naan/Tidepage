import { z } from "zod";
import { localeSchema } from "@/shared/i18n/schema";
import type { Locale } from "@/shared/i18n/config";
import { articleBlockSchema } from "./blocks";
import { editorDocumentSchema } from "./editor-document";
import { categorySchema, sketchSchema } from "./taxonomy";
import type { NoteImage } from "./note-images";
import { isUploadedAssetId } from "@/shared/contracts/asset-path";

export { categorySchema, sketchSchema } from "./taxonomy";
export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const sectionSchema = z.object({
  title: z.string().min(1),
  paragraphs: z.array(z.string()),
  blocks: z.array(articleBlockSchema).max(50).optional(),
});
export const articleSchema = z.object({
  locale: localeSchema,
  slug: slugSchema,
  title: z.string().min(1),
  date: z.iso.date(),
  updatedAt: z.iso.datetime(),
  category: categorySchema,
  tags: z.array(z.string()),
  minutes: z.number().int().positive(),
  sketch: sketchSchema,
  excerpt: z.string(),
  sections: z.array(sectionSchema),
  body: editorDocumentSchema.optional(),
  publication: z
    .object({
      author: z.string(),
      seoTitle: z.string(),
      seoDescription: z.string(),
      cover: z
        .object({
          assetId: z.string().refine(isUploadedAssetId),
          alt: z.string(),
        })
        .optional(),
      publishedAt: z.iso.datetime(),
    })
    .optional(),
});
export type Category = z.infer<typeof categorySchema>;
export type Article = z.infer<typeof articleSchema>;
export const articleSummarySchema = articleSchema.omit({
  sections: true,
  body: true,
  publication: true,
});
export type ArticleSummary = z.infer<typeof articleSummarySchema>;
export type Note = {
  images: NoteImage[];
  body?: Article["body"];
  locale: Locale;
  id: string;
  date: string;
  publishedOn: string;
  mood: string;
  text: string;
  tag: string;
  sketch: z.infer<typeof sketchSchema>;
};
export type NoteListEntry = Omit<Note, "body" | "images"> & {
  cover: Pick<NoteImage, "assetId" | "alt"> | null;
  imageCount: number;
  truncated: boolean;
};
export type Project = {
  body?: Article["body"];
  locale: Locale;
  id: string;
  name: string;
  subtitle: string;
  category: string;
  status: string;
  description: string;
  stack: string[];
  sketch: z.infer<typeof sketchSchema>;
  color: string;
};
export type Quote = {
  id: string;
  locale: Locale;
  text: string;
  author: string;
};
export type NotePreview = Pick<Note, "mood" | "date" | "text" | "tag">;
export type NavigationOverview = {
  note: NotePreview | null;
  projects: Pick<Project, "id" | "name" | "subtitle">[];
};
export function summarize({
  sections: _sections,
  body: _body,
  publication: _publication,
  ...summary
}: Article): ArticleSummary {
  return summary;
}
