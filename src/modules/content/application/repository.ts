import type {
  Article,
  ArticleSummary,
  Note,
  Project,
  Quote,
} from "../domain/models";
import type { ArticleQuery } from "../domain/query";
import type { Page } from "@/shared/contracts/api";
// Every adapter returns only published content, including publication-time checks.
export interface ContentRepository {
  listArticles(query: ArticleQuery): Promise<Page<ArticleSummary>>;
  allArticles(): Promise<ArticleSummary[]>;
  articleBySlug(slug: string): Promise<Article | null>;
  notes(): Promise<Note[]>;
  projects(): Promise<Project[]>;
  quotes(): Promise<Quote[]>;
}
