import { z } from "zod";
import type { Locale } from "@/shared/i18n/config";

const equipment = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[\p{L}\p{N} ._+()/'×−-]+$/u);
export const photoCaptureSchema = z.object({
  camera: equipment.optional(),
  lens: equipment.optional(),
  focalLength: z.number().positive().max(5000).optional(),
  aperture: z.number().positive().max(128).optional(),
  exposureSeconds: z.number().min(0.000001).max(86_400).optional(),
  iso: z.number().int().positive().max(10_000_000).optional(),
});
export type PhotoCapture = z.infer<typeof photoCaptureSchema>;

export const assetCaptureSchema = photoCaptureSchema.extend({
  locality: z
    .object({
      name: z.string().min(1).max(100),
      zh: z.string().min(1).max(100).optional(),
    })
    .optional(),
});
export type AssetCapture = z.infer<typeof assetCaptureSchema>;

export function photoLocationLabel(
  capture: AssetCapture | null | undefined,
  locale: Locale,
) {
  const city = capture?.locality;
  return (locale === "zh-CN" ? city?.zh : undefined) ?? city?.name ?? "";
}
