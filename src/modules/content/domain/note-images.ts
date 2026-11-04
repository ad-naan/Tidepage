import { z } from "zod";
import { isUploadedAssetId } from "@/shared/contracts/asset-path";
export const noteImageSchema = z
  .object({
    assetId: z.string().refine(isUploadedAssetId),
    alt: z.string().max(300),
    caption: z.string().max(500),
  })
  .strict();
export const noteImagesSchema = z
  .array(noteImageSchema)
  .max(20)
  .refine(
    (images) =>
      new Set(images.map((image) => image.assetId)).size === images.length,
  );
export type NoteImage = z.infer<typeof noteImageSchema>;
