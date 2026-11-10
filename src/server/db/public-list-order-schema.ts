import { integer, jsonb, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import type { PublicListKind } from "@/shared/contracts/public-list-order";
import type { Locale } from "@/shared/i18n/config";

export const publicListOrdersTable = pgTable(
  "public_list_orders",
  {
    kind: text("kind").$type<PublicListKind>().notNull(),
    locale: text("locale").$type<Locale>().notNull(),
    revision: integer("revision").notNull(),
    ranks: jsonb("ranks").$type<Record<string, number>>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.kind, table.locale] })],
);
