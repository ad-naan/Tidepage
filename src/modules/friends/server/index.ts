import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Database } from "@/server/db/client";
import { publicListRank } from "@/server/db/public-list-rank";
import { workbenchRecordsTable as records } from "@/server/workbench/schema";
import { conflictError, notFoundError } from "@/server/http/errors";
import type { Locale } from "@/shared/i18n/config";
import { localeSchema } from "@/shared/i18n/schema";
import {
  friendDraftSchema,
  type PublicFriend,
} from "@/modules/friends/domain/models";
import { friendsTable as friends } from "@/modules/friends/infrastructure/schema";

export function listPublicFriends(
  locale: Locale,
  db: Database = getDb(),
): Promise<PublicFriend[]> {
  return db
    .select({
      id: friends.id,
      url: friends.url,
      category: friends.category,
      name: friends.name,
      description: friends.description,
    })
    .from(friends)
    .where(eq(friends.locale, locale))
    .orderBy(
      publicListRank("friends", locale, friends.id),
      asc(friends.sortOrder),
      asc(friends.id),
    );
}

export function listFriendPublications(
  ownerId: string,
  db: Database = getDb(),
) {
  return db
    .select({ id: friends.id, locale: friends.locale })
    .from(friends)
    .where(eq(friends.ownerId, ownerId));
}

const publicationSchema = z
  .object({
    id: z.string().min(1).max(120),
    locale: localeSchema,
    revision: z.number().int().positive(),
  })
  .strict();

export async function setFriendPublication(
  ownerId: string,
  raw: unknown,
  visible: boolean,
  db: Database = getDb(),
) {
  const { id, locale, revision } = publicationSchema.parse(raw);
  return db.transaction(async (tx) => {
    const [record] = await tx
      .select({ value: records.value })
      .from(records)
      .where(and(eq(records.ownerId, ownerId), eq(records.key, "friends")))
      .for("update");
    const item =
      record &&
      friendDraftSchema
        .array()
        .parse(record.value)
        .find((entry) => entry.id === id);
    if (!item || (visible && item.deletedAt)) throw notFoundError();
    if (item.revision !== revision) throw conflictError();
    if (!visible) {
      await tx
        .delete(friends)
        .where(
          and(
            eq(friends.id, id),
            eq(friends.locale, locale),
            eq(friends.ownerId, ownerId),
          ),
        );
    } else {
      const value = {
        id,
        ownerId,
        locale,
        url: item.url,
        category: item.category,
        sortOrder: z.int32().parse(item.sortOrder),
        name: z
          .string()
          .trim()
          .min(1)
          .max(60)
          .parse(item.translations[locale]?.name),
        description: item.translations[locale]?.description.trim() ?? "",
      };
      const [saved] = await tx
        .insert(friends)
        .values(value)
        .onConflictDoUpdate({
          target: [friends.id, friends.locale],
          set: value,
          setWhere: eq(friends.ownerId, ownerId),
        })
        .returning({ id: friends.id });
      if (!saved) throw conflictError();
    }
    return { id, locale, visible };
  });
}
