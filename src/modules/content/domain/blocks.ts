import { z } from "zod";
const webUrl = z.url({ protocol: /^https?$/ });
const imageUrl = z
  .string()
  .refine(
    (value) =>
      /^\/(?!\/)[^\\]*$/.test(value) ||
      z.url({ protocol: /^https$/ }).safeParse(value).success,
    "Expected a local asset or HTTPS image",
  );
export const articleBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("link"),
    url: webUrl,
    title: z.string().min(1).max(200),
    description: z.string().max(1200),
    image: imageUrl.optional(),
    imageAlt: z.string().max(200).optional(),
    siteName: z.string().max(80).optional(),
  }),
  z.object({
    type: z.literal("movie"),
    url: webUrl,
    title: z.string().min(1).max(200),
    originalTitle: z.string().max(200).optional(),
    year: z.number().int().min(1888).max(2200),
    director: z.string().max(200),
    note: z.string().max(1200),
    artwork: imageUrl.optional(),
    artworkAlt: z.string().max(200).optional(),
  }),
  z.object({
    type: z.literal("callout"),
    title: z.string().max(200),
    text: z.string().max(4000),
    tone: z.enum(["note", "tip"]).default("note"),
  }),
  z.object({
    type: z.literal("code"),
    language: z.string().max(40),
    code: z.string().max(30000),
    caption: z.string().max(200).optional(),
  }),
]);
export type ArticleBlock = z.infer<typeof articleBlockSchema>;

/** Machine-readable publishing keeps the same references as the rendered article. */
export function blockMarkdown(block: ArticleBlock): string {
  const link = (text: string) => text.replace(/[\\\[\]]/g, "\\$&");
  switch (block.type) {
    case "link":
      return `[${link(block.title)}](${block.url})\n\n${block.description}`;
    case "movie":
      return `[${link(block.title)} (${block.year})](${block.url}) · ${block.director}\n\n${block.note}`;
    case "callout":
      return `> **${block.title}**\n> ${block.text.replaceAll("\n", "\n> ")}`;
    case "code": {
      const fence = "`".repeat(
        Math.max(
          3,
          ...(block.code.match(/`+/g) || []).map((s) => s.length + 1),
        ),
      );
      return `${fence}${block.language.replace(/[^\w+-]/g, "")}\n${block.code}\n${fence}`;
    }
  }
}
