import "server-only";
import { eq, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Database } from "@/server/db/client";
import { conflictError } from "@/server/http/errors";
import { collectionPublicationSchema } from "@/modules/content/domain/managed-collections";
import {
  noteImagesSchema,
  noteImageSchema,
} from "@/modules/content/domain/note-images";
import { sketchSchema } from "@/modules/content/domain/taxonomy";
import { notesTable } from "@/modules/content/infrastructure/schema";
import { requireOwnedAssets } from "@/modules/media/server";
import {
  requireCollectionAssets,
  requireSavedCollection,
} from "./managed-collections";
export async function publishNote(
  ownerId: string,
  raw: unknown,
  db: Database = getDb(),
  canAdopt = false,
) {
  const request = collectionPublicationSchema.parse(raw);
  return db.transaction(async (tx) => {
    const database = tx as unknown as Database;
    const item = await requireSavedCollection(
      database,
      ownerId,
      "notes",
      request,
    );
    const text = z
      .string()
      .trim()
      .min(1)
      .max(50000)
      .parse(item.translations[request.locale]?.text);
    const images = noteImagesSchema.parse(item.images[request.locale] ?? []);
    images.forEach((image) =>
      noteImageSchema
        .extend({ alt: z.string().trim().min(1).max(300) })
        .parse(image),
    );
    await requireOwnedAssets(
      ownerId,
      images.map((image) => image.assetId),
      database,
    );
    const body = item.documents?.[request.locale] ?? null;
    await requireCollectionAssets(ownerId, database, body);
    const now = new Date();
    const value = {
      id: item.id,
      sourceOwner: ownerId,
      locale: request.locale,
      publishedOn: z.iso.date().parse(item.publishedOn),
      text,
      mood: z
        .string()
        .max(80)
        .parse(item.translations[request.locale]?.mood ?? ""),
      tag: z
        .string()
        .max(80)
        .parse(item.translations[request.locale]?.tag ?? ""),
      sketch: sketchSchema.parse(item.sketch),
      images,
      body,
      visibility: "published" as const,
      publishedAt: now,
      updatedAt: now,
    };
    const [saved] = await tx
      .insert(notesTable)
      .values(value)
      .onConflictDoUpdate({
        target: [notesTable.id, notesTable.locale],
        set: {
          ...value,
          publishedAt: sql`coalesce(${notesTable.publishedAt}, excluded.published_at)`,
        },
        setWhere: or(
          eq(notesTable.sourceOwner, ownerId),
          canAdopt ? isNull(notesTable.sourceOwner) : undefined,
        ),
      })
      .returning({ id: notesTable.id });
    if (!saved) throw conflictError();
    return { id: value.id, locale: value.locale };
  });
}
