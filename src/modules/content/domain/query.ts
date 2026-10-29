import { z } from "zod";
import { categorySchema } from "./models";
import { localeQuerySchema } from "@/shared/i18n/schema";
const categoryAliases: Record<string, string> = { "技术": "technology", "产品": "product", "生活": "life" };
export const articleQuerySchema = z
  .object({
    locale: localeQuerySchema,
    page: z.coerce.number().int().min(1).max(10000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(12),
    q: z.string().trim().max(100).default(""),
    category: z.preprocess(v => typeof v === "string" ? categoryAliases[v] ?? v : v, categorySchema.optional()),
  })
  .strict();
export type ArticleQuery = z.infer<typeof articleQuerySchema>;
