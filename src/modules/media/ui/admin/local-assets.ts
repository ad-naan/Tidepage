import { readLocalRecord, writeLocalRecord } from "@/shared/lib/browser-store";
import {
  assetSchema,
  imageTypes,
  maxImageBytes,
  type ImageUploader,
  type ImageAsset,
} from "@/modules/media/domain/assets";
export async function listLocalAssets(
  includeArchived = false,
): Promise<ImageAsset[]> {
  const value = await readLocalRecord("assets");
  return value === undefined
    ? []
    : assetSchema
        .array()
        .parse(value)
        .filter((asset) => includeArchived || !asset.archived);
}
export const localImageUploader: ImageUploader = {
  async upload(file, { signal, onProgress }) {
    signal.throwIfAborted();
    if (
      !(imageTypes as readonly string[]).includes(file.type) ||
      !file.size ||
      file.size > maxImageBytes
    )
      throw new Error("IMAGE_TYPE_SIZE");
    onProgress(10);
    const bitmap = await createImageBitmap(file);
    let asset: ImageAsset;
    try {
      asset = assetSchema.parse({
        id: crypto.randomUUID(),
        name: file.name,
        mime: file.type,
        size: file.size,
        width: bitmap.width,
        height: bitmap.height,
        createdAt: new Date().toISOString(),
      });
    } finally {
      bitmap.close();
    }
    signal.throwIfAborted();
    onProgress(55);
    await navigator.locks.request("tidepage:assets", async () => {
      signal.throwIfAborted();
      const assets = await listLocalAssets(true);
      // Blob stays in IndexedDB; object URLs are session resources, never persisted.
      await writeLocalRecord(`asset:${asset.id}`, file);
      await writeLocalRecord("assets", [asset, ...assets]);
    });
    onProgress(100);
    return asset;
  },
};
export async function resolveLocalAsset(id: string): Promise<Blob> {
  const value = await readLocalRecord(`asset:${id}`);
  if (!(value instanceof Blob)) throw new Error("ASSET_MISSING");
  return value;
}
export async function archiveLocalAsset(id: string, archived: boolean) {
  await navigator.locks.request("tidepage:assets", async () => {
    const assets = await listLocalAssets(true);
    await writeLocalRecord(
      "assets",
      assets.map((asset) => (asset.id === id ? { ...asset, archived } : asset)),
    );
  });
}
