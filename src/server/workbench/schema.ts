import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { usersTable } from "@/modules/identity/infrastructure/schema";

/** Private working state, separate from published business records. */
export const workbenchRecordsTable = pgTable(
  "workbench_records",
  {
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    revision: integer("revision").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.ownerId, table.key] })],
);
