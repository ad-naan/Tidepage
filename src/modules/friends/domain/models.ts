import { z } from "zod";
import { safeWebUrl } from "@/shared/contracts/rich-text";

const friendCategorySchema = z.enum(["technology", "design", "life"]);
export const friendDraftSchema = z.object({
  id: z.string(),
  revision: z.number().int().min(0),
  url: safeWebUrl,
  category: friendCategorySchema,
  sortOrder: z.number(),
  deletedAt: z.string().optional(),
  translations: z.record(
    z.string(),
    z.object({ name: z.string().max(60), description: z.string().max(160) }),
  ),
});
export type SiteLinkInfo = {
  name: string;
  url: string;
  avatar: string;
  description: string;
};
