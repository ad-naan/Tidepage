import type {
  Article,
  ArticleSummary,
  Note,
  Project,
  Quote,
} from "../domain/models";
import type { ArticleQuery } from "../domain/query";
import type { Page } from "@/shared/contracts/api";
import type { Locale } from "@/shared/i18n/config";
// Every adapter returns only published content, including publication-time checks.
export interface ContentRepository {
  listArticles(query: ArticleQuery): Promise<Page<ArticleSummary>>;
  allArticles(locale: Locale): Promise<ArticleSummary[]>;
  articleBySlug(slug: string, locale: Locale): Promise<Article | null>;
  articleLocales(slug: string): Promise<Locale[]>;
  notes(locale: Locale): Promise<Note[]>;
  projects(locale: Locale): Promise<Project[]>;
  quotes(locale: Locale): Promise<Quote[]>;
}
