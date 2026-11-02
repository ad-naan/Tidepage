import { z } from "zod";

export const friendCategorySchema = z.enum(["technology", "design", "life"]);
export const friendLinkSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().min(1).max(160),
  url: z.url().refine((value) => {
    try {
      const url = new URL(value);
      return (
        ["https:", "http:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }),
  category: friendCategorySchema,
});
export type FriendLink = z.infer<typeof friendLinkSchema>;
export const friendDraftSchema = z.object({
  id: z.string(),
  revision: z.number().int().min(0),
  url: friendLinkSchema.shape.url,
  category: friendLinkSchema.shape.category,
  sortOrder: z.number(),
  deletedAt: z.string().optional(),
  translations: z.record(
    z.string(),
    z.object({ name: z.string().max(60), description: z.string().max(160) }),
  ),
});
export type FriendDirectory = { items: FriendLink[] };
export type SiteLinkInfo = {
  name: string;
  url: string;
  avatar: string;
  description: string;
};
