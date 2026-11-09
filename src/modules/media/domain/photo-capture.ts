import { z } from "zod";

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
