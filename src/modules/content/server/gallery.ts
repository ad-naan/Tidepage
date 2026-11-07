import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Database } from "@/server/db/client";
import {
  conflictError,
  notFoundError,
  validationError,
} from "@/server/http/errors";
import { workbenchRecordsTable as records } from "@/server/workbench/schema";
import { requireOwnedImageDimensions } from "@/modules/media/server";
import { isUploadedAssetId } from "@/shared/contracts/asset-path";
import type { Locale } from "@/shared/i18n/config";
import { publicationRequestSchema } from "@/modules/content/domain/publication";
import {
  galleryCategorySchema,
  type GalleryPhoto,
} from "@/modules/content/domain/gallery";
import { managedItemSchema } from "@/modules/content/domain/managed-collections";
import { galleryPhotosTable as photos } from "@/modules/content/infrastructure/schema";

export function listGalleryPhotos(
  locale: Locale,
  db: Database = getDb(),
): Promise<GalleryPhoto[]> {
  return db
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
    })
    .from(photos)
    .where(eq(photos.locale, locale))
    .orderBy(asc(photos.sortOrder), desc(photos.publishedOn), asc(photos.id));
}

const photoCopy = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(""),
  alt: z.string().trim().min(1).max(300),
  location: z.string().trim().max(200).default(""),
});

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
    if (!isUploadedAssetId(item.assetId)) throw validationError();
    const { title, description, alt, location } = photoCopy.parse(
      item.translations[locale],
    );
    const asset = await requireOwnedImageDimensions(
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
      place: location,
      category: galleryCategorySchema.parse(item.category),
      sortOrder: z
        .number()
        .int()
        .min(-2147483648)
        .max(2147483647)
        .parse(item.sortOrder),
      publishedOn: z.iso.date().parse(item.publishedOn),
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
