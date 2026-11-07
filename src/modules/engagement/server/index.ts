import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb, type Database } from "@/server/db/client";
import { notFoundError } from "@/server/http/errors";
import { usersTable } from "@/modules/identity/server/schema";
import { commentsTable as comments } from "@/modules/engagement/infrastructure/schema";
import {
  discussionQuerySchema,
  newCommentSchema,
  type DiscussionTarget,
  type Comment,
  type CommentPage,
} from "@/modules/engagement/domain/discussion";
import type { Locale } from "@/shared/i18n/config";
import { profileAvatarColumn } from "@/modules/identity/server/profile";
import { publicAvatarUrl } from "@/shared/contracts/avatar";

export { requireEngagementTarget as requireDiscussionTarget } from "./targets";

/** The same store serves every content type; reply foreign keys include the thread. */
export function discussionStore(db: Database = getDb()) {
  const parent = alias(comments, "parent_comment");
  const parentAuthor = alias(usersTable, "parent_author");
  const thread = (target: DiscussionTarget, locale: Locale) =>
    and(
      eq(comments.targetType, target.type),
      eq(comments.targetId, target.id),
      eq(comments.locale, locale),
    );
  const fields = {
    id: comments.id,
    body: comments.body,
    document: comments.document,
    author: usersTable.displayName,
    avatarUrl: profileAvatarColumn(usersTable.id),
    createdAt: comments.createdAt,
    parentId: comments.parentId,
    replyTo: parentAuthor.displayName,
  };
  const serialize = (
    row: Omit<Comment, "createdAt"> & { createdAt: Date },
  ): Comment => ({
    ...row,
    avatarUrl: publicAvatarUrl(row.avatarUrl),
    createdAt: row.createdAt.toISOString(),
  });
  return {
    async list(raw: unknown): Promise<CommentPage> {
      const { type, id, locale, after } = discussionQuerySchema.parse(raw);
      const target = { type, id };
      let beyondCursor;
      if (after) {
        const [cursor] = await db
          .select({ createdAt: comments.createdAt, id: comments.id })
          .from(comments)
          .where(and(thread(target, locale), eq(comments.id, after)))
          .limit(1);
        if (!cursor) throw notFoundError();
        // Compare in PostgreSQL to preserve sub-millisecond timestamp precision.
        beyondCursor = sql`(${comments.createdAt}, ${comments.id}) > (select created_at, id from comments where id = ${cursor.id}::uuid)`;
      }
      const rows = await db
        .select(fields)
        .from(comments)
        .innerJoin(usersTable, eq(comments.userId, usersTable.id))
        .leftJoin(parent, eq(comments.parentId, parent.id))
        .leftJoin(parentAuthor, eq(parent.userId, parentAuthor.id))
        .where(and(thread(target, locale), beyondCursor))
        .orderBy(asc(comments.createdAt), asc(comments.id))
        .limit(21);
      const items = rows.slice(0, 20).map(serialize);
      return { items, next: rows.length > 20 ? items.at(-1)!.id : null };
    },
    async create(userId: string, raw: unknown): Promise<Comment> {
      const input = newCommentSchema.parse(raw);
      if (input.parentId) {
        const [reply] = await db
          .select({ id: comments.id })
          .from(comments)
          .where(
            and(
              thread(input.target, input.locale),
              eq(comments.id, input.parentId),
            ),
          )
          .limit(1);
        if (!reply) throw notFoundError();
      }
      const [created] = await db
        .insert(comments)
        .values({
          targetType: input.target.type,
          targetId: input.target.id,
          locale: input.locale,
          userId,
          body: input.body,
          document: input.document,
          parentId: input.parentId,
        })
        .returning({ id: comments.id });
      const [row] = await db
        .select(fields)
        .from(comments)
        .innerJoin(usersTable, eq(comments.userId, usersTable.id))
        .leftJoin(parent, eq(comments.parentId, parent.id))
        .leftJoin(parentAuthor, eq(parent.userId, parentAuthor.id))
        .where(eq(comments.id, created.id))
        .limit(1);
      return serialize(row);
    },
  };
}
