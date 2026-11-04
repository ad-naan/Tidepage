import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, type Database } from "@/server/db/client";
import { interactionsTable as interactions } from "@/modules/engagement/infrastructure/schema";
import {
  interactionChangeSchema,
  interactionQuerySchema,
  type InteractionState,
} from "@/modules/engagement/domain/interactions";

export function interactionStore(db: Database = getDb()) {
  async function read(
    raw: unknown,
    userId: string | null,
  ): Promise<InteractionState[]> {
    const { type, ids, locale } = interactionQuerySchema.parse(raw);
    const rows = await db
      .select({
        id: interactions.targetId,
        likeCount: sql<number>`count(*) filter (where ${interactions.kind} = 'like')::int`,
        liked: userId
          ? sql<boolean>`bool_or(${interactions.kind} = 'like' and ${interactions.userId} = ${userId}::uuid)`
          : sql<boolean>`false`,
        saved: userId
          ? sql<boolean>`bool_or(${interactions.kind} = 'save' and ${interactions.userId} = ${userId}::uuid)`
          : sql<boolean>`false`,
      })
      .from(interactions)
      .where(
        and(
          eq(interactions.targetType, type),
          eq(interactions.locale, locale),
          inArray(interactions.targetId, ids),
        ),
      )
      .groupBy(interactions.targetId);
    const byId = new Map(rows.map((row) => [row.id, row]));
    return [...new Set(ids)].map((id) => {
      const row = byId.get(id);
      return {
        target: { type, id },
        likeCount: row?.likeCount ?? 0,
        liked: row?.liked ?? false,
        saved: row?.saved ?? false,
      };
    });
  }
  return {
    read,
    async set(userId: string, raw: unknown): Promise<InteractionState> {
      const input = interactionChangeSchema.parse(raw);
      return db.transaction(async (tx) => {
        const value = {
          userId,
          targetType: input.target.type,
          targetId: input.target.id,
          locale: input.locale,
          kind: input.kind,
        };
        if (input.active)
          await tx.insert(interactions).values(value).onConflictDoNothing();
        else
          await tx
            .delete(interactions)
            .where(
              and(
                eq(interactions.userId, userId),
                eq(interactions.targetType, value.targetType),
                eq(interactions.targetId, value.targetId),
                eq(interactions.locale, value.locale),
                eq(interactions.kind, value.kind),
              ),
            );
        return (
          await interactionStore(tx as unknown as Database).read(
            {
              type: value.targetType,
              ids: [value.targetId],
              locale: value.locale,
            },
            userId,
          )
        )[0];
      });
    },
  };
}
