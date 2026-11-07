import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import type { Locale } from "@/shared/i18n/config";
import type { PublicFriend } from "@/modules/friends/domain/models";

export const friendsTable = pgTable(
  "friend_links",
  {
    id: text("id").notNull(),
    ownerId: uuid("owner_id").notNull(),
    locale: text("locale").$type<Locale>().notNull(),
    url: text("url").notNull(),
    category: text("category").$type<PublicFriend["category"]>().notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id, table.locale] }),
    index("friend_links_listing_idx").on(
      table.locale,
      table.sortOrder,
      table.id,
    ),
  ],
);
