export const uploadFilenamePattern = /^[a-f0-9]{64}\.(png|jpg|webp|gif)$/;
export const uploadUrlPrefix = "/uploads/";
export function uploadedAssetId(filename: string) {
  if (!uploadFilenamePattern.test(filename))
    throw new Error("INVALID_ASSET_FILENAME");
  return uploadUrlPrefix + filename;
}
export function isUploadedAssetId(value: string) {
  return (
    value.startsWith(uploadUrlPrefix) &&
    uploadFilenamePattern.test(value.slice(uploadUrlPrefix.length))
  );
}
