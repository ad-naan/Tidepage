import { z } from "zod";
import { categorySchema } from "./models";
export const articleQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(12),
    q: z.string().trim().max(100).default(""),
    category: categorySchema.optional(),
  })
  .strict();
export type ArticleQuery = z.infer<typeof articleQuerySchema>;
