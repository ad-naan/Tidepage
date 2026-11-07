import "server-only";
import { getTableName, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { identitiesTable } from "../infrastructure/schema";

/** Scalar lookup avoids multiplying comment rows when a user links two providers. */
export function profileAvatarColumn(userId: AnyPgColumn) {
  // Keep the outer reference qualified even in Drizzle's single-table selects.
  const outerUser = sql`${sql.identifier(getTableName(userId.table))}.${sql.identifier(userId.name)}`;
  return sql<string | null>`(select ${identitiesTable.profileAvatarUrl}
    from ${identitiesTable}
    where ${identitiesTable.userId} = ${outerUser}
      and ${identitiesTable.profileAvatarUrl} is not null
      and ${identitiesTable.profileAvatarUrl} <> ''
    order by ${identitiesTable.updatedAt} desc, ${identitiesTable.id}
    limit 1)`;
}
