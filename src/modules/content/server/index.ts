import "server-only";
import { cache } from "react";
import { z } from "zod";
import { getEnv } from "@/server/config/env";
import { getCacheStore } from "@/server/cache/redis";
import { createRemember } from "@/server/cache/remember";
import { createContentService } from "@/modules/content/application/service";
import {
  articleSchema,
  articleSummarySchema,
  slugSchema,
} from "@/modules/content/domain/models";
import { postgresContentRepository } from "@/modules/content/infrastructure/postgres-repository";
import { defaultLocale, type Locale } from "@/shared/i18n/config";
let remember: ReturnType<typeof createRemember> | undefined;
function memo() {
  return (remember ??= createRemember(getCacheStore()));
}
const service = () => createContentService(postgresContentRepository());
const key = (locale: Locale, resource: string) =>
  `${locale}:content:${resource}`;
const notePreview = z.object({
  mood: z.string(),
  text: z.string(),
  tag: z.string(),
  date: z.string(),
});
const projectPreviews = z.array(
  z.object({ id: z.string(), name: z.string(), subtitle: z.string() }),
);
export const getLatestNote = cache((locale: Locale) =>
  memo()(
    key(locale, "latest-note"),
    getEnv().CACHE_TTL_SECONDS,
    notePreview.nullable(),
    () => postgresContentRepository().latestNote(locale),
  ),
);
export const getProjectPreviews = cache((locale: Locale) =>
  memo()(
    key(locale, "project-previews"),
    getEnv().CACHE_TTL_SECONDS,
    projectPreviews,
    () => postgresContentRepository().projectPreviews(locale),
  ),
);
export const getFirstQuote = cache((locale: Locale) =>
  postgresContentRepository().firstQuote(locale),
);
export const getVisibleContentIds = (
  type: "article" | "note" | "project",
  ids: string[],
  locale: Locale,
) => postgresContentRepository().visibleIds(type, ids, locale);
const articleSummaries = z.array(articleSummarySchema);
export const getFeaturedArticles = cache((locale: Locale) =>
  memo()(
    key(locale, "featured-articles"),
    getEnv().CACHE_TTL_SECONDS,
    z.object({ items: articleSummaries, total: z.number() }),
    async () => {
      const { items, total } = await service().listArticles({
        locale,
        pageSize: 5,
      });
      return { items, total };
    },
  ),
);
export const getArticles = cache(async (locale: Locale = defaultLocale) =>
  memo()(
    key(locale, "articles"),
    getEnv().CACHE_TTL_SECONDS,
    articleSummaries,
    async () => (await service()).allArticles(locale),
  ),
);
export const getArticle = cache(
  async (input: string, locale: Locale = defaultLocale) => {
    const slug = slugSchema.parse(input);
    return memo()(
      key(locale, `article:${slug}`),
      getEnv().CACHE_TTL_SECONDS,
      articleSchema.nullable(),
      async () => (await service()).articleBySlug(slug, locale),
    );
  },
);
export const getArticleLocales = cache(async (slug: string) =>
  (await service()).articleLocales(slug),
);
export async function getNextArticle(slug: string, locale: Locale) {
  return (
    (await postgresContentRepository().nextArticle(slug, locale)) ??
    (await getFeaturedArticles(locale)).items[0]
  );
}
export const listArticles = async (input: unknown) =>
  (await service()).listArticles(input);
export const getNotes = cache(async (locale: Locale = defaultLocale) =>
  (await service()).notes(locale),
);
export const getProjects = cache(async (locale: Locale = defaultLocale) =>
  (await service()).projects(locale),
);
export const getQuotes = cache(async (locale: Locale = defaultLocale) =>
  (await service()).quotes(locale),
);
export async function invalidateContentCache(slug: string, locale: Locale) {
  const store = getCacheStore();
  await Promise.all([
    store.delete(key(locale, "articles")),
    store.delete(key(locale, "featured-articles")),
    store.delete(key(locale, `article:${slug}`)),
  ]);
}
export function invalidateNotePreview(locale: Locale) {
  return getCacheStore().delete(key(locale, "latest-note"));
}
export { articleMarkdown } from "@/modules/content/application/markdown";
