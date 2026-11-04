import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  check,
  foreignKey,
  unique,
  primaryKey,
} from "drizzle-orm/pg-core";
import { usersTable } from "@/modules/identity/server/schema";
import type { DiscussionTarget } from "@/modules/engagement/domain/discussion";
import type { Locale } from "@/shared/i18n/config";

export const commentsTable = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: text("target_type").$type<DiscussionTarget["type"]>().notNull(),
    targetId: text("target_id").notNull(),
    locale: text("locale").$type<Locale>().notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("comments_thread_idx").on(
      table.targetType,
      table.targetId,
      table.locale,
      table.createdAt,
      table.id,
    ),
    unique("comments_thread_identity").on(
      table.id,
      table.targetType,
      table.targetId,
      table.locale,
    ),
    foreignKey({
      columns: [table.parentId, table.targetType, table.targetId, table.locale],
      foreignColumns: [
        table.id,
        table.targetType,
        table.targetId,
        table.locale,
      ],
      name: "comments_parent_thread_fk",
    }),
    check(
      "comments_target_type_valid",
      sql`${table.targetType} in ('article', 'note', 'project', 'page')`,
    ),
    check(
      "comments_body_valid",
      sql`char_length(trim(${table.body})) between 1 and 2000`,
    ),
  ],
);

export const interactionsTable = pgTable(
  "content_interactions",
  {
    targetType: text("target_type").$type<DiscussionTarget["type"]>().notNull(),
    targetId: text("target_id").notNull(),
    locale: text("locale").$type<Locale>().notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"like" | "save">().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.targetType,
        table.targetId,
        table.locale,
        table.userId,
        table.kind,
      ],
    }),
    index("interactions_content_idx").on(
      table.targetType,
      table.locale,
      table.targetId,
    ),
    index("interactions_user_idx").on(table.userId, table.kind),
    check("interactions_kind_valid", sql`${table.kind} in ('like', 'save')`),
    check(
      "interactions_target_valid",
      sql`${table.targetType} in ('article', 'note', 'project', 'page')`,
    ),
  ],
);
