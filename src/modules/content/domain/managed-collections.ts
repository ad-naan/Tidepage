export const collections = ["notes", "projects", "quotes", "gallery"] as const;
export type Collection = (typeof collections)[number];
import { z } from "zod";
import { noteImagesSchema } from "./note-images";
export const managedItemSchema = z.object({
  deletedAt: z.iso.datetime().optional(),
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
  translations: z.record(z.string(), z.record(z.string(), z.string())),
});
