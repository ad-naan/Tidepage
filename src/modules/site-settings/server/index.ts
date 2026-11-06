import "server-only";
import { cache } from "react";
import { and, desc, eq } from "drizzle-orm";
import { getDb, type Database } from "@/server/db/client";
import { getCatalog } from "@/server/i18n/messages";
import { workbenchRecordsTable } from "@/server/workbench/schema";
import { usersTable } from "@/modules/identity/server/schema";
import { locales, type Locale } from "@/shared/i18n/config";
import { settingsDraftSchema } from "../domain/models";
import { resolveSiteIdentity, type SiteIdentity } from "../domain/identity";
import { resolvePersonalPage, resolveSitePage } from "../domain/pages";

export async function readPublicSiteFields(
  locale: Locale,
  db: Database = getDb(),
): Promise<Record<string, string>> {
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
  return Object.fromEntries(
    Object.entries(fields ?? {}).filter(
      ([key]) =>
        [
          "siteName",
          "seoTitle",
          "siteDescription",
          "seoDescription",
          "aboutTitle",
          "aboutIntro",
          "aboutIdentity",
          "aboutPersonality",
          "aboutSections",
          "signature",
          "siteAboutTitle",
          "siteAboutIntro",
          "siteAboutSections",
        ].includes(key) || /^aboutInterest(?:Note)?[1-4]$/.test(key),
    ),
  );
}

export async function readPublicSiteIdentity(
  locale: Locale,
  defaults: SiteIdentity,
  db: Database = getDb(),
): Promise<SiteIdentity> {
  return resolveSiteIdentity(await readPublicSiteFields(locale, db), defaults);
}

const getPublicSiteFields = cache((locale: Locale) =>
  readPublicSiteFields(locale),
);

// Request-local memoization only: saving settings is visible on the next request.
export const getPublicSiteIdentity = cache(async (locale: Locale) => {
  const { site } = await getCatalog(locale);
  return resolveSiteIdentity(await getPublicSiteFields(locale), {
    name: site.name,
    title: site.title,
    description: site.description,
  });
});

export const getPersonalPage = cache(async (locale: Locale) => {
  const [catalog, fields] = await Promise.all([
    getCatalog(locale),
    getPublicSiteFields(locale),
  ]);
  return resolvePersonalPage(fields, catalog.about.profile);
});

export const getSitePage = cache(async (locale: Locale) => {
  const [catalog, fields] = await Promise.all([
    getCatalog(locale),
    getPublicSiteFields(locale),
  ]);
  return resolveSitePage(fields, catalog.siteAbout.content);
});

export async function getPageEditorDefaults() {
  return Object.fromEntries(
    await Promise.all(
      locales.map(async (locale) => {
        const catalog = await getCatalog(locale);
        const personal = catalog.about.profile;
        const sitePage = catalog.siteAbout.content;
        return [
          locale,
          {
            aboutTitle: personal.title,
            aboutIntro: personal.intro,
            aboutIdentity: personal.identity,
            aboutPersonality: personal.personality,
            aboutSections: JSON.stringify(personal.sections),
            signature: personal.signature,
            siteAboutTitle: sitePage.title,
            siteAboutIntro: sitePage.intro,
            siteAboutSections: JSON.stringify(sitePage.sections),
            ...Object.fromEntries(
              personal.interests.flatMap((interest, i) => [
                [`aboutInterest${i + 1}`, interest.label],
                [`aboutInterestNote${i + 1}`, interest.description],
              ]),
            ),
          },
        ];
      }),
    ),
  );
}
