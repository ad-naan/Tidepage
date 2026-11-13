import { z } from "zod";
import { localeQuerySchema } from "@/shared/i18n/schema";

/** Keep display spelling, but give equivalent tags the same identity. */
export function tagLabel(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^#+\s*/, "");
}
export function tagKey(value: string) {
  return tagLabel(value).toLowerCase();
}
export function normalizeTags(values: string[]) {
  const tags = new Map<string, string>();
  for (const value of values) {
    const label = tagLabel(value);
    if (label && !tags.has(tagKey(label))) tags.set(tagKey(label), label);
  }
  return [...tags.values()];
}
export function parseTags(value: string) {
  return normalizeTags(value.split(/[,，]/));
}
export const tagFilterSchema = z.string().max(80).transform(tagKey);
export const tagQuerySchema = z
  .object({
    locale: localeQuerySchema,
    kind: z.enum(["articles", "notes"]).optional(),
    q: z.string().trim().max(80).default(""),
    limit: z.coerce.number().int().min(1).max(30).default(20),
  })
  .strict();
export type TagQuery = z.infer<typeof tagQuerySchema>;
export type ContentTag = { key: string; label: string; count: number };
export function taggedUrl(kind: "articles" | "notes", tag: string) {
  return `/${kind}?${new URLSearchParams({ tag: tagKey(tag) })}`;
}
