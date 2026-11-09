import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { getEnv } from "@/server/config/env";
import { validationError, notFoundError } from "@/server/http/errors";
import { maxImageBytes, type ImageAsset } from "@/modules/media/domain/assets";
import {
  uploadFilenamePattern,
  uploadedAssetId,
} from "@/modules/media/domain/asset-path";
import { readPhotoCapture } from "./photo-capture";

export function uploadRoot() {
  return path.resolve(getEnv().UPLOAD_DIR);
}
export async function saveImage(
  bytes: Buffer,
  name: string,
  root = uploadRoot(),
): Promise<ImageAsset> {
  if (!bytes.length || bytes.length > maxImageBytes) throw validationError();
  const { default: sharp } = await import("sharp");
  const image = sharp(bytes, { animated: true, limitInputPixels: 40_000_000 });
  const metadata = await image.metadata().catch(() => {
    throw validationError();
  });
  const { format } = metadata;
  let { width, height } = metadata;
  height = metadata.pageHeight ?? height;
  const formats = {
    jpeg: ["jpg", "image/jpeg"],
    png: ["png", "image/png"],
    webp: ["webp", "image/webp"],
    gif: ["gif", "image/gif"],
  } as const;
  const detected = formats[format as keyof typeof formats];
  if (!detected || !width || !height || width > 20000 || height > 20000)
    throw validationError();
  const [extension, mime] = detected;
  const capture = readPhotoCapture(metadata.exif);
  if (
    metadata.exif ||
    metadata.xmp ||
    metadata.iptc ||
    metadata.tifftagPhotoshop ||
    metadata.comments?.length
  ) {
    // The public file contains decoded image data only. Bake orientation into
    // still images before Sharp drops the original EXIF and other metadata.
    if ((metadata.pages ?? 1) === 1) image.autoOrient();
    if (format === "jpeg")
      image.jpeg({ quality: 95, chromaSubsampling: "4:4:4" });
    if (format === "webp") image.webp({ quality: 95 });
    const result = await image
      .toBuffer({ resolveWithObject: true })
      .catch(() => {
        throw validationError();
      });
    bytes = result.data;
    width = result.info.width;
    height = result.info.pageHeight ?? result.info.height;
    if (bytes.length > maxImageBytes) throw validationError();
  }
  const filename = `${createHash("sha256").update(bytes).digest("hex")}.${extension}`;
  await fs.mkdir(root, { recursive: true });
  try {
    // Runtime resources are mounted separately, never traced into the application.
    await fs.writeFile(
      path.join(/* turbopackIgnore: true */ root, filename),
      bytes,
      { flag: "wx" },
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  return {
    id: uploadedAssetId(filename),
    name: path.basename(name.replaceAll("\\", "/")).slice(0, 200),
    mime,
    size: bytes.length,
    width,
    height,
    createdAt: new Date().toISOString(),
    archived: false,
    capture,
  };
}
export async function readImage(filename: string, root = uploadRoot()) {
  if (!uploadFilenamePattern.test(filename)) throw notFoundError();
  try {
    const bytes = await fs.readFile(
      path.join(/* turbopackIgnore: true */ root, filename),
    );
    const mime = (
      {
        png: "image/png",
        jpg: "image/jpeg",
        webp: "image/webp",
        gif: "image/gif",
      } as Record<string, string>
    )[filename.split(".").at(-1)!];
    return { bytes, mime };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      throw notFoundError();
    throw error;
  }
}
