import { z } from "zod";
import { localeSchema } from "@/shared/i18n/schema";
import { engagementTargetSchema } from "./target";
import { commentDocumentSchema } from "./comment-document";
import { documentText, type EditorNode } from "@/shared/contracts/rich-text";

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
    body: z.string().trim().min(1).max(2000).optional(),
    document: commentDocumentSchema.optional(),
    parentId: z.uuid().optional(),
  })
  .strict()
  .refine((value) => Boolean(value.body || value.document), { path: ["body"] })
  .transform((value) => ({
    ...value,
    body: value.document ? documentText(value.document).trim() : value.body!,
  }));
export type Comment = {
  id: string;
  body: string;
  document?: EditorNode | null;
  author: string;
  avatarUrl?: string | null;
  createdAt: string;
  parentId: string | null;
  replyTo: string | null;
};
export type CommentPage = { items: Comment[]; next: string | null };
