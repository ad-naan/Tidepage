import { date, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

export const aiUsageTable = pgTable(
  "ai_usage",
  {
    scope: text("scope").notNull(),
    subject: text("subject").notNull(),
    day: date("day").notNull(),
    used: integer("used").notNull(),
  },
  (table) => [primaryKey({ columns: [table.scope, table.subject] })],
);
