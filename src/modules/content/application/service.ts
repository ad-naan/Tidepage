import type { ContentRepository } from "./repository";
import { articleQuerySchema } from "../domain/query";
import { slugSchema } from "../domain/models";
import { defaultLocale, type Locale } from "@/shared/i18n/config";
export function createContentService(repository: ContentRepository) {
  return {
    listArticles: (input: unknown = {}) =>
      repository.listArticles(articleQuerySchema.parse(input)),
    allArticles: (locale: Locale = defaultLocale) => repository.allArticles(locale),
    articleBySlug: (slug: string, locale: Locale = defaultLocale) => repository.articleBySlug(slugSchema.parse(slug), locale),
    articleLocales: (slug: string) => repository.articleLocales(slugSchema.parse(slug)),
    notes: (locale: Locale = defaultLocale) => repository.notes(locale),
    projects: (locale: Locale = defaultLocale) => repository.projects(locale),
    quotes: (locale: Locale = defaultLocale) => repository.quotes(locale),
  };
}
