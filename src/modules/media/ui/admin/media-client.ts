import { apiGet, apiSend } from "@/shared/http/client";
import { isUploadedAssetId } from "@/modules/media/domain/asset-path";
import {
  assetSchema,
  imageTypes,
  maxImageBytes,
  type ImageUploader,
  type ImageAsset,
} from "@/modules/media/domain/assets";
export async function listAssets(
  includeArchived = false,
): Promise<ImageAsset[]> {
  return assetSchema
    .array()
    .parse(await apiGet(`/api/v1/media?archived=${includeArchived}`));
}
export const imageUploader: ImageUploader = {
  async upload(file, { signal, onProgress }) {
    signal.throwIfAborted();
    if (
      !(imageTypes as readonly string[]).includes(file.type) ||
      !file.size ||
      file.size > maxImageBytes
    )
      throw new Error("IMAGE_TYPE_SIZE");
    onProgress(10);
    const body = new FormData();
    body.set("file", file);
    const asset = assetSchema.parse(
      await apiSend("/api/v1/media", "POST", body, { signal }),
    );
    onProgress(100);
    return asset;
  },
};
export async function resolveAsset(id: string): Promise<Blob> {
  if (!isUploadedAssetId(id)) throw new Error("ASSET_MISSING");
  const response = await fetch(id, { credentials: "same-origin" });
  if (!response.ok) throw new Error("ASSET_MISSING");
  return response.blob();
}
export async function archiveAsset(id: string, archived: boolean) {
  await apiSend("/api/v1/media", "PATCH", { id, archived });
}
