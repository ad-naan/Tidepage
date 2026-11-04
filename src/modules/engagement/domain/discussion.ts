import { z } from "zod";
import { localeSchema } from "@/shared/i18n/schema";
import { engagementTargetSchema } from "./target";

export const discussionTargetSchema = engagementTargetSchema;
export type DiscussionTarget = z.infer<typeof discussionTargetSchema>;
export const discussionQuerySchema = z
  .object({
    ...discussionTargetSchema.shape,
    locale: localeSchema,
    after: z.uuid().optional(),
  })
  .strict();
export const newCommentSchema = z
  .object({
    target: discussionTargetSchema,
    locale: localeSchema,
    body: z.string().trim().min(1).max(2000),
    parentId: z.uuid().optional(),
  })
  .strict();
export type Comment = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
  parentId: string | null;
  replyTo: string | null;
};
export type CommentPage = { items: Comment[]; next: string | null };
