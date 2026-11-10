export const collections = ["notes", "projects", "quotes", "gallery"] as const;
export type Collection = (typeof collections)[number];
import { z } from "zod";
import { noteImagesSchema } from "./note-images";
import { editorDocumentSchema } from "@/shared/contracts/rich-text";
import { localeSchema } from "@/shared/i18n/schema";
export const editorialCollectionSchema = z.enum([
  "notes",
  "projects",
  "quotes",
]);
export type EditorialCollection = z.infer<typeof editorialCollectionSchema>;
export const collectionPublicationDateSchema = z.object({
  publishedOn: z.iso.date(),
});
export const collectionItemId = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const collectionPublicationSchema = z
  .object({
    id: collectionItemId,
    locale: localeSchema,
    revision: z.number().int().positive(),
  })
  .strict();
export type PublishedCollectionItem = {
  id: string;
  titles: Partial<Record<z.infer<typeof localeSchema>, string>>;
};
export const collectionTitleKey = {
  notes: "text",
  projects: "name",
  quotes: "text",
  gallery: "title",
} as const;
export const managedItemSchema = z.object({
  deletedAt: z.iso.datetime().optional(),
  trashedLocales: z.array(localeSchema).optional(),
  id: z.string(),
  revision: z.number().int().min(0),
  updatedAt: z.iso.datetime(),
  sortOrder: z.number(),
  publishedOn: z.string(),
  category: z.string(),
  sketch: z.string(),
  color: z.string(),
  assetId: z.string(),
  images: z.record(z.string(), noteImagesSchema).default({}),
  documents: z.record(z.string(), editorDocumentSchema).optional(),
  translations: z.record(z.string(), z.record(z.string(), z.string())),
});
