import "server-only";
import { cache } from "react";
import { and, desc, eq } from "drizzle-orm";
import { getDb, type Database } from "@/server/db/client";
import { getCatalog } from "@/server/i18n/messages";
import { workbenchRecordsTable } from "@/server/workbench/schema";
import { workbenchRecords } from "@/server/workbench/records";
import { usersTable } from "@/modules/identity/server/schema";
import { locales, type Locale } from "@/shared/i18n/config";
import { profile, profileLinks } from "@/shared/config/profile";
import { navigationItems } from "@/shared/config/site";
import { isUploadedAssetId } from "@/shared/contracts/asset-path";
import { settingsDraftSchema, type SettingsDraft } from "../domain/models";
import {
  resolveHomeCopy,
  resolveSiteIdentity,
  type SiteIdentity,
} from "../domain/identity";
import { resolvePersonalPage, resolveSitePage } from "../domain/pages";
import {
  resolveSitePresentation,
  arrangeFeatured,
} from "../domain/presentation";
import { getArticle, getFeaturedArticles } from "@/modules/content/server";
import { summarize } from "@/modules/content/domain/models";

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
          "footer",
          "publicContact",
          "navigationOrder",
          "featuredSlugs",
          "seoTitle",
          "siteDescription",
          "seoDescription",
          "shareAssetId",
          "shareAssetIdAlt",
          "avatarAssetId",
          "name",
          "identity",
          "intro",
          "github",
          "gitee",
          "heroTitle",
          "heroDescription",
          "aboutTitle",
          "aboutIntro",
          "aboutIdentity",
          "aboutPersonality",
          "aboutSections",
          "aboutBody",
          "signature",
          "siteAboutTitle",
          "siteAboutIntro",
          "siteAboutSections",
          "siteAboutBody",
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

export const getPublicSitePresentation = cache(async (locale: Locale) =>
  resolveSitePresentation(await getPublicSiteFields(locale)),
);

export const getConfiguredFeaturedArticles = cache(async (locale: Locale) => {
  const [settings, recent] = await Promise.all([
    getPublicSitePresentation(locale),
    getFeaturedArticles(locale),
  ]);
  const selected = await Promise.all(
    settings.featuredSlugs.map(async (slug) => {
      const article = await getArticle(slug, locale);
      return article ? summarize(article) : null;
    }),
  );
  return {
    items: arrangeFeatured(selected, recent.items),
    total: recent.total,
  };
});

export const getPublicHomeCopy = cache(async (locale: Locale) =>
  resolveHomeCopy(await getPublicSiteFields(locale)),
);

export const getPublicSiteAvatar = cache(async (locale: Locale) => {
  const { avatarAssetId } = await getPublicSiteFields(locale);
  return avatarAssetId && isUploadedAssetId(avatarAssetId)
    ? avatarAssetId
    : profile.avatar;
});

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

async function getPageEditorDefaults() {
  return Object.fromEntries(
    await Promise.all(
      locales.map(async (locale) => {
        const catalog = await getCatalog(locale);
        const personal = catalog.about.profile;
        const sitePage = catalog.siteAbout.content;
        return [
          locale,
          {
            name: profile.name,
            identity: catalog.home.hero.intro.line2,
            intro: catalog.home.hero.intro.description,
            ...Object.fromEntries(
              profileLinks
                .filter(({ key }) => key !== "spark")
                .map(({ key, href }) => [key, href]),
            ),
            siteName: catalog.site.name,
            siteDescription: catalog.site.description,
            navigationOrder: navigationItems.map(({ key }) => key).join(", "),
            publicContact: `${catalog.contact.body1}\n${catalog.contact.body2}`,
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

export async function readSiteSettingsEditorState(
  ownerId: string,
  db: Database = getDb(),
): Promise<SettingsDraft> {
  const [defaults, record] = await Promise.all([
    getPageEditorDefaults(),
    workbenchRecords(db).read(ownerId, "site-settings"),
  ]);
  const stored = record.value ?? { revision: 0, translations: {} };
  return {
    revision: stored.revision,
    translations: Object.fromEntries(
      locales.map((locale) => {
        const fields = { ...defaults[locale], ...stored.translations[locale] };
        // These public fields use defaults when empty, so show their effective value.
        for (const key of [
          "name",
          "identity",
          "intro",
          "github",
          "gitee",
          "siteName",
          "siteDescription",
          "navigationOrder",
          "publicContact",
        ]) {
          if (!fields[key]?.trim()) fields[key] = defaults[locale][key];
        }
        return [locale, fields];
      }),
    ),
  };
}
