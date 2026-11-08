import { z } from "zod";
import { isEditorDocument } from "@/shared/contracts/rich-text";
import { locales } from "@/shared/i18n/config";
import { navigationItems } from "@/shared/config/site";
import { settingList } from "./presentation";
import { musicSettingsSchema } from "@/shared/contracts/music";
export const settingsDraftSchema = z
  .object({
    revision: z.number().int().min(0),
    translations: z.record(z.string(), z.record(z.string(), z.string())),
    music: musicSettingsSchema.optional(),
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

/** Validate new writes without making legacy draft-only values break public reads. */
export const settingsWriteSchema = settingsDraftSchema.superRefine(
  (settings, ctx) => {
    for (const [locale, fields] of Object.entries(settings.translations)) {
      if (!(locales as readonly string[]).includes(locale))
        ctx.addIssue({
          code: "custom",
          path: ["translations", locale],
          message: "Unsupported locale",
        });
      const invalid = (key: string, message: string) =>
        ctx.addIssue({
          code: "custom",
          path: ["translations", locale, key],
          message,
        });
      for (const [key, value] of Object.entries(fields)) {
        const max = ["aboutBody", "siteAboutBody"].includes(key)
          ? 500_000
          : 20_000;
        if (value.length > max) invalid(key, "Field is too long");
      }
      const order = settingList(fields.navigationOrder);
      if (
        order.some((key) => !navigationItems.some((item) => item.key === key))
      )
        invalid("navigationOrder", "Unknown navigation key");
      const featured = settingList(fields.featuredSlugs);
      if (
        featured.length > 5 ||
        featured.some(
          (slug) =>
            slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),
        )
      )
        invalid("featuredSlugs", "Use up to five article slugs");
      if ((fields.publicContact?.length ?? 0) > 1000)
        invalid("publicContact", "Contact is too long");
      if ((fields.footer?.length ?? 0) > 500)
        invalid("footer", "Footer is too long");
    }
  },
);

export type SettingsDraft = z.infer<typeof settingsDraftSchema>;
