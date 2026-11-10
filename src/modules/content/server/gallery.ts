import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Database } from "@/server/db/client";
import { publicListRank } from "@/server/db/public-list-rank";
import {
  conflictError,
  notFoundError,
  validationError,
} from "@/server/http/errors";
import { workbenchRecordsTable as records } from "@/server/workbench/schema";
import { requireOwnedImageDetails } from "@/modules/media/server";
import {
  photoCaptureSchema,
  photoLocationLabel,
} from "@/modules/media/domain/photo-capture";
import { isUploadedAssetId } from "@/shared/contracts/asset-path";
import type { Locale } from "@/shared/i18n/config";
import { publicationRequestSchema } from "@/modules/content/domain/publication";
import {
  galleryCategorySchema,
  type GalleryPhoto,
} from "@/modules/content/domain/gallery";
import {
  collectionPublicationDateSchema,
  managedItemSchema,
  type PublishedCollectionItem,
} from "@/modules/content/domain/managed-collections";
import { galleryPhotosTable as photos } from "@/modules/content/infrastructure/schema";

export async function listGalleryPhotos(
  locale: Locale,
  db: Database = getDb(),
): Promise<GalleryPhoto[]> {
  const rows = await db
    .select({
      id: photos.id,
      src: photos.assetId,
      title: photos.title,
      caption: photos.caption,
      alt: photos.alt,
      place: photos.place,
      category: photos.category,
      width: photos.width,
      height: photos.height,
      capture: photos.capture,
    })
    .from(photos)
    .where(eq(photos.locale, locale))
    .orderBy(
      publicListRank("gallery", locale, photos.id),
      asc(photos.sortOrder),
      desc(photos.publishedOn),
      asc(photos.id),
    );
  return rows.map((row) => ({
    ...row,
    capture: photoCaptureSchema.safeParse(row.capture).data ?? null,
  }));
}

const photoCopy = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(""),
  alt: z.string().trim().min(1).max(300),
  location: z.string().trim().max(200).optional(),
});

export async function listGalleryPublications(
  ownerId: string,
  db: Database = getDb(),
): Promise<PublishedCollectionItem[]> {
  const rows = await db
    .select({ id: photos.id, locale: photos.locale, title: photos.title })
    .from(photos)
    .where(eq(photos.ownerId, ownerId));
  const titlesById = new Map<string, PublishedCollectionItem["titles"]>();
  for (const { id, locale, title } of rows) {
    const titles = titlesById.get(id) ?? {};
    titles[locale] = title;
    titlesById.set(id, titles);
  }
  return Array.from(titlesById, ([id, titles]) => ({ id, titles }));
}

export async function setGalleryPublication(
  ownerId: string,
  raw: unknown,
  visible: boolean,
  db: Database = getDb(),
) {
  const { id, locale, revision } = publicationRequestSchema.parse(raw);
  return db.transaction(async (tx) => {
    const [record] = await tx
      .select({ value: records.value })
      .from(records)
      .where(
        and(
          eq(records.ownerId, ownerId),
          eq(records.key, "collection:gallery"),
        ),
      )
      .for("update");
    const item =
      record &&
      managedItemSchema
        .array()
        .parse(record.value)
        .find((photo) => photo.id === id);
    if (!item || (visible && item.deletedAt)) throw notFoundError();
    if (item.revision !== revision) throw conflictError();
    if (!visible) {
      await tx
        .delete(photos)
        .where(
          and(
            eq(photos.id, id),
            eq(photos.locale, locale),
            eq(photos.ownerId, ownerId),
          ),
        );
      return { id, locale, visible };
    }
    const { publishedOn } = collectionPublicationDateSchema.parse(item);
    if (!isUploadedAssetId(item.assetId)) throw validationError();
    const { title, description, alt, location } = photoCopy.parse(
      item.translations[locale],
    );
    const { locality, ...asset } = await requireOwnedImageDetails(
      ownerId,
      item.assetId,
      tx as unknown as Database,
    );
    const value = {
      ...asset,
      id,
      ownerId,
      locale,
      assetId: item.assetId,
      title,
      caption: description,
      alt,
      place: location ?? photoLocationLabel({ locality }, locale),
      category: galleryCategorySchema.parse(item.category),
      sortOrder: z
        .number()
        .int()
        .min(-2147483648)
        .max(2147483647)
        .parse(item.sortOrder),
      publishedOn,
    };
    const [published] = await tx
      .insert(photos)
      .values(value)
      .onConflictDoUpdate({
        target: [photos.id, photos.locale],
        set: value,
        setWhere: eq(photos.ownerId, ownerId),
      })
      .returning({ id: photos.id });
    if (!published) throw conflictError();
    return { id, locale, visible };
  });
}
