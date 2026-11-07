import { z } from "zod";
import { isEditorDocument } from "@/shared/contracts/rich-text";
export const settingsDraftSchema = z
  .object({
    revision: z.number().int().min(0),
    translations: z.record(z.string(), z.record(z.string(), z.string())),
  })
  .superRefine((settings, ctx) => {
    for (const [locale, fields] of Object.entries(settings.translations)) {
      for (const key of ["aboutBody", "siteAboutBody"]) {
        if (!fields[key]?.trim()) continue;
        let valid = false;
        try {
          valid = isEditorDocument(JSON.parse(fields[key]));
        } catch {
          /* Report an invalid field without discarding a saved document. */
        }
        if (!valid)
          ctx.addIssue({
            code: "custom",
            path: ["translations", locale, key],
            message: "Invalid rich text document",
          });
      }
    }
  });

export type SettingsDraft = z.infer<typeof settingsDraftSchema>;
