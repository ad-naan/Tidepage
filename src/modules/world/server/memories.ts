import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, type Database } from "@/server/db/client";
import { notFoundError } from "@/server/http/errors";
import { coastMemoriesTable as memories } from "../infrastructure/schema";
import type {
  CoastMemory,
  CoastMemoryPage,
  CoastReceipt,
} from "@/shared/contracts/coast-memories";

const fields = {
  id: memories.id,
  kind: memories.kind,
  place: memories.place,
  day: memories.day,
  withHost: memories.withHost,
  companionCount: memories.companionCount,
  occurredAt: memories.occurredAt,
};
const serialize = (
  row: Omit<CoastMemory, "occurredAt"> & { occurredAt: Date },
): CoastMemory => ({ ...row, occurredAt: row.occurredAt.toISOString() });
export function coastMemoryStore(db: Database = getDb()) {
  return {
    async list(userId: string, after?: string): Promise<CoastMemoryPage> {
      let cursor;
      if (after) {
        const [found] = await db
          .select({ id: memories.id })
          .from(memories)
          .where(and(eq(memories.userId, userId), eq(memories.id, after)))
          .limit(1);
        if (!found) throw notFoundError();
        cursor = sql`(${memories.createdAt}, ${memories.id}) < (select created_at, id from coast_memories where id = ${after}::uuid and user_id = ${userId}::uuid)`;
      }
      const rows = await db
        .select(fields)
        .from(memories)
        .where(and(eq(memories.userId, userId), cursor))
        .orderBy(desc(memories.createdAt), desc(memories.id))
        .limit(21);
      return {
        items: rows.slice(0, 20).map(serialize),
        next: rows.length > 20 ? rows[19].id : null,
      };
    },
    async save(userId: string, receipt: CoastReceipt): Promise<CoastMemory> {
      await db
        .insert(memories)
        .values({
          userId,
          source: receipt.source,
          kind: receipt.kind,
          place: receipt.place,
          day: receipt.day,
          withHost: receipt.withHost,
          companionCount: receipt.companionCount,
          occurredAt: new Date(receipt.occurredAt),
        })
        .onConflictDoNothing({ target: [memories.userId, memories.source] });
      const [row] = await db
        .select(fields)
        .from(memories)
        .where(
          and(eq(memories.userId, userId), eq(memories.source, receipt.source)),
        )
        .limit(1);
      return serialize(row);
    },
  };
}
