import { z } from "zod";

export const categorySchema = z.enum(["技术", "产品", "生活"]);
export const sketchSchema = z.enum(["sun", "mountain", "boat", "tree"]);
export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const sectionSchema = z.object({
  title: z.string().min(1),
  paragraphs: z.array(z.string()),
});
export const articleSchema = z.object({
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
  id: string;
  date: string;
  publishedOn: string;
  mood: string;
  text: string;
  tag: string;
  sketch: z.infer<typeof sketchSchema>;
};
export type Project = {
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
export type Quote = { id: string; text: string; author: string };
export function summarize({
  sections: _sections,
  ...summary
}: Article): ArticleSummary {
  return summary;
}
