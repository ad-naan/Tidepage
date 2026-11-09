import { z } from "zod";
import { assetCaptureSchema } from "./photo-capture";
export const imageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export const maxImageBytes = 12 * 1024 * 1024;
export const assetSchema = z.object({
  archived: z.boolean().optional(),
  id: z.string(),
  name: z.string(),
  mime: z.enum(imageTypes),
  size: z.number().positive().max(maxImageBytes),
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
  createdAt: z.iso.datetime(),
  capture: assetCaptureSchema.nullish(),
});
export type ImageAsset = z.infer<typeof assetSchema>;
export interface ImageUploader {
  upload(
    file: File,
    options: { signal: AbortSignal; onProgress: (progress: number) => void },
  ): Promise<ImageAsset>;
}
