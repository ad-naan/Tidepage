import type { ContentRepository } from "./repository";
import { articleQuerySchema } from "../domain/query";
import { slugSchema } from "../domain/models";
export function createContentService(repository: ContentRepository) {
  return {
    listArticles: (input: unknown = {}) =>
      repository.listArticles(articleQuerySchema.parse(input)),
    allArticles: () => repository.allArticles(),
    articleBySlug: (slug: string) =>
      repository.articleBySlug(slugSchema.parse(slug)),
    notes: () => repository.notes(),
    projects: () => repository.projects(),
    quotes: () => repository.quotes(),
  };
}
