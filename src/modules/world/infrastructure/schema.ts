import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  date,
  timestamp,
  unique,
  index,
  check,
} from "drizzle-orm/pg-core";
import { usersTable } from "@/modules/identity/server/schema";
import type { CoastMemory } from "@/shared/contracts/coast-memories";

export const coastMemoriesTable = pgTable(
  "coast_memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    kind: text("kind").$type<CoastMemory["kind"]>().notNull(),
    place: text("place").$type<CoastMemory["place"]>().notNull(),
    day: date("day").notNull(),
    withHost: boolean("with_host").notNull().default(false),
    companionCount: integer("companion_count").notNull().default(0),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("coast_memories_owner_source").on(t.userId, t.source),
    index("coast_memories_owner_created_idx").on(t.userId, t.createdAt, t.id),
    check("coast_memories_kind_valid", sql`${t.kind} in ('visit','photo')`),
    check(
      "coast_memories_place_valid",
      sql`${t.place} in ('dock','beach','bench','cottage')`,
    ),
    check(
      "coast_memories_count_valid",
      sql`${t.companionCount} between 0 and 11`,
    ),
    check(
      "coast_memories_source_valid",
      sql`char_length(${t.source}) between 1 and 100`,
    ),
  ],
);
