import { z } from "zod";
import { navigationItems } from "@/shared/config/site";
import { localeSchema } from "@/shared/i18n/schema";

export const readerPageSchema = z.strictObject({
  locale: localeSchema,
  path: z.union([
    z.enum([...navigationItems.map(({ href }) => href), "/explore"]),
    z
      .string()
      .max(130)
      .regex(/^\/articles\/[a-z0-9]+(?:-[a-z0-9]+)*$/),
  ]),
});

export const readerSnapshotInterval = 3_000;
export const readerPageLimit = 8;
export const readerCountSchema = readerPageSchema.extend({
  count: z.int().positive(),
});
export const readerSnapshotSchema = z.strictObject({
  total: z.int().nonnegative(),
  pages: z.array(readerCountSchema).max(readerPageLimit),
});
export type ReaderPage = z.infer<typeof readerPageSchema>;
export type ReaderCount = z.infer<typeof readerCountSchema>;
export type ReaderSnapshot = z.infer<typeof readerSnapshotSchema>;
