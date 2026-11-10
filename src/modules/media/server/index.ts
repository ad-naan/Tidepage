import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, type Database } from "@/server/db/client";
import { notFoundError, validationError } from "@/server/http/errors";
import { mediaAssetsTable as assets } from "@/modules/media/infrastructure/schema";
import {
  saveImage,
  readImage,
} from "@/modules/media/infrastructure/local-storage";
import { assetSchema } from "@/modules/media/domain/assets";
import { isUploadedAssetId } from "@/shared/contracts/asset-path";
import type { ImageDimensionsBySource } from "@/shared/contracts/image-dimensions";
import {
  assetCaptureSchema,
  photoCaptureSchema,
} from "@/modules/media/domain/photo-capture";

export async function requireOwnedAssets(
  ownerId: string,
  ids: string[],
  db: Database = getDb(),
  includeArchived = false,
) {
  if (!ids.length) return;
  const rows = await db
    .select({ id: assets.id })
    .from(assets)
    .where(
      and(
        eq(assets.ownerId, ownerId),
        includeArchived ? undefined : eq(assets.archived, false),
        inArray(assets.id, ids),
      ),
    );
  if (new Set(rows.map((row) => row.id)).size !== new Set(ids).size)
    throw validationError();
}

/** Only intrinsic dimensions for already referenced, public content-addressed files. */
export async function getImageDimensions(
  sources: string[],
  database?: Database,
): Promise<ImageDimensionsBySource> {
  const ids = [...new Set(sources.filter(isUploadedAssetId))];
  if (!ids.length) return {};
  const rows = await (database ?? getDb())
    .selectDistinct({
      id: assets.id,
      width: assets.width,
      height: assets.height,
    })
    .from(assets)
    .where(inArray(assets.id, ids));
  return Object.fromEntries(
    rows.map(({ id, width, height }) => [id, { width, height }]),
  );
}

export async function uploadImage(
  ownerId: string,
  bytes: Buffer,
  name: string,
  db: Database = getDb(),
) {
  const value = await saveImage(bytes, name);
  const [saved] = await db
    .insert(assets)
    .values({ ...value, ownerId, createdAt: new Date(value.createdAt) })
    .onConflictDoUpdate({
      target: [assets.ownerId, assets.id],
      set: {
        archived: false,
        capture: sql`coalesce(excluded.capture || ${assets.capture}, ${assets.capture}, excluded.capture)`,
      },
    })
    .returning();
  return assetSchema.parse({
    ...saved,
    createdAt: saved.createdAt.toISOString(),
  });
}

export async function requireOwnedImageDetails(
  ownerId: string,
  id: string,
  db: Database = getDb(),
) {
  const [image] = await db
    .select({
      width: assets.width,
      height: assets.height,
      capture: assets.capture,
    })
    .from(assets)
    .where(
      and(
        eq(assets.ownerId, ownerId),
        eq(assets.id, id),
        eq(assets.archived, false),
      ),
    );
  if (!image) throw validationError();
  return {
    ...image,
    capture: image.capture ? photoCaptureSchema.parse(image.capture) : null,
    locality: assetCaptureSchema.safeParse(image.capture).data?.locality,
  };
}
export async function readAsset(
  ownerId: string,
  id: string,
  db: Database = getDb(),
) {
  const [row] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.ownerId, ownerId), eq(assets.id, id)));
  if (!row) throw notFoundError();
  return assetSchema.parse({ ...row, createdAt: row.createdAt.toISOString() });
}
export async function listAssets(ownerId: string, includeArchived = false) {
  const rows = await getDb()
    .select()
    .from(assets)
    .where(
      and(
        eq(assets.ownerId, ownerId),
        includeArchived ? undefined : eq(assets.archived, false),
      ),
    )
    .orderBy(desc(assets.createdAt));
  return rows.map((row) =>
    assetSchema.parse({ ...row, createdAt: row.createdAt.toISOString() }),
  );
}
export async function archiveAsset(
  ownerId: string,
  id: string,
  archived: boolean,
) {
  const rows = await getDb()
    .update(assets)
    .set({ archived })
    .where(and(eq(assets.ownerId, ownerId), eq(assets.id, id)))
    .returning({ id: assets.id });
  if (!rows.length) throw notFoundError();
}
export async function uploadedImageResponse(filename: string) {
  const { bytes, mime } = await readImage(filename);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
