import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Database } from "@/server/db/client";
import { conflictError } from "@/server/http/errors";
import { articleDraftSchema } from "@/modules/content/domain/editor-document";
import { managedItemSchema } from "@/modules/content/domain/managed-collections";
import { friendDraftSchema } from "@/modules/friends/domain/models";
import { settingsDraftSchema } from "@/modules/site-settings/domain/models";
import { requireOwnedAssets } from "@/modules/media/server";
import { workbenchRecordsTable as records } from "./schema";

export const recordKeySchema = z.enum([
  "articles",
  "friends",
  "site-settings",
  "collection:notes",
  "collection:projects",
  "collection:quotes",
  "collection:gallery",
]);
type Key = z.infer<typeof recordKeySchema>;
const valueSchemas = {
  articles: articleDraftSchema.array(),
  friends: friendDraftSchema.array(),
  "site-settings": settingsDraftSchema,
  "collection:notes": managedItemSchema.array(),
  "collection:projects": managedItemSchema.array(),
  "collection:quotes": managedItemSchema.array(),
  "collection:gallery": managedItemSchema.array(),
};

export function workbenchRecords(db: Database = getDb()) {
  return {
    async read<K extends Key>(ownerId: string, key: K, lock = false) {
      const query = db
        .select()
        .from(records)
        .where(and(eq(records.ownerId, ownerId), eq(records.key, key)));
      const [row] = await (lock ? query.for("update") : query);
      return {
        revision: row?.revision ?? 0,
        value: row
          ? (valueSchemas[key].parse(row.value) as z.infer<
              (typeof valueSchemas)[K]
            >)
          : null,
      };
    },
    async write(ownerId: string, key: Key, revision: number, input: unknown) {
      const value = valueSchemas[key].parse(input);
      if (key === "site-settings" && "translations" in value) {
        const assets = new Set(
          Object.values(value.translations).flatMap(
            ({ avatarAssetId, shareAssetId }) =>
              [avatarAssetId, shareAssetId].filter(Boolean),
          ),
        );
        await requireOwnedAssets(ownerId, [...assets], db, true);
      }
      const [row] =
        revision === 0
          ? await db
              .insert(records)
              .values({ ownerId, key, value, revision: 1 })
              .onConflictDoNothing()
              .returning({ revision: records.revision })
          : await db
              .update(records)
              .set({ value, revision: revision + 1, updatedAt: new Date() })
              .where(
                and(
                  eq(records.ownerId, ownerId),
                  eq(records.key, key),
                  eq(records.revision, revision),
                ),
              )
              .returning({ revision: records.revision });
      if (!row) throw conflictError();
      return row;
    },
  };
}
