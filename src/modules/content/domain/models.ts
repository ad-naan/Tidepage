import { z } from "zod";
import { localeSchema } from "@/shared/i18n/schema";
import type { Locale } from "@/shared/i18n/config";
import { articleBlockSchema } from "./blocks";

export const categorySchema = z.enum(["technology", "product", "life"]);
export const sketchSchema = z.enum(["sun", "mountain", "boat", "tree"]);
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
});
export type Category = z.infer<typeof categorySchema>;
export type Article = z.infer<typeof articleSchema>;
export type ArticleSummary = Omit<Article, "sections">;
export type Note = {
  locale: Locale;
  id: string;
  date: string;
  publishedOn: string;
  mood: string;
  text: string;
  tag: string;
  sketch: z.infer<typeof sketchSchema>;
};
export type Project = {
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
export type NavigationOverview = {
  note: Pick<Note, "mood" | "date" | "text"> | null;
  projects: Pick<Project, "id" | "name" | "subtitle">[];
};
export function summarize({
  sections: _sections,
  ...summary
}: Article): ArticleSummary {
  return summary;
}
