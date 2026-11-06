import "server-only";
import { cache } from "react";
import { and, desc, eq } from "drizzle-orm";
import { getDb, type Database } from "@/server/db/client";
import { getCatalog } from "@/server/i18n/messages";
import { workbenchRecordsTable } from "@/server/workbench/schema";
import { usersTable } from "@/modules/identity/server/schema";
import type { Locale } from "@/shared/i18n/config";
import { settingsDraftSchema } from "../domain/models";
import { resolveSiteIdentity, type SiteIdentity } from "../domain/identity";

export async function readPublicSiteIdentity(
  locale: Locale,
  defaults: SiteIdentity,
  db: Database = getDb(),
): Promise<SiteIdentity> {
  const [record] = await db
    .select({ value: workbenchRecordsTable.value })
    .from(workbenchRecordsTable)
    .innerJoin(usersTable, eq(workbenchRecordsTable.ownerId, usersTable.id))
    .where(
      and(
        eq(workbenchRecordsTable.key, "site-settings"),
        eq(usersTable.role, "admin"),
      ),
    )
    .orderBy(
      desc(workbenchRecordsTable.updatedAt),
      workbenchRecordsTable.ownerId,
    )
    .limit(1);
  const fields = record
    ? settingsDraftSchema.parse(record.value).translations[locale]
    : undefined;
  return resolveSiteIdentity(fields, defaults);
}

// Request-local memoization only: saving settings is visible on the next request.
export const getPublicSiteIdentity = cache(async (locale: Locale) => {
  const { site } = await getCatalog(locale);
  return readPublicSiteIdentity(locale, {
    name: site.name,
    title: site.title,
    description: site.description,
  });
});
