import { z } from "zod";
export const settingsDraftSchema = z.object({
  revision: z.number().int().min(0),
  translations: z.record(z.string(), z.record(z.string(), z.string())),
});
