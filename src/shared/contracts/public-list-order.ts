import { z } from "zod";
import { localeSchema } from "@/shared/i18n/schema";

export const publicListKinds = [
  "articles",
  "notes",
  "projects",
  "quotes",
  "gallery",
  "friends",
] as const;
export type PublicListKind = (typeof publicListKinds)[number];
export const publicListQuerySchema = z.object({
  kind: z.enum(publicListKinds),
  locale: localeSchema,
});
export const publicListOrderSchema = publicListQuerySchema.extend({
  revision: z.int32().nonnegative(),
  ids: z.array(z.string().min(1).max(140)).max(5000),
});
export type PublicListOrder = {
  revision: number;
  items: { id: string; title: string }[];
};
