import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  gt,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { getDb, isUndefinedColumn, type Database } from "@/server/db/client";
import { dateKey, formatDate } from "@/shared/lib/date-time";
import { noteImagesSchema } from "@/modules/content/domain/note-images";
import {
  articleSchema,
  articleSummarySchema,
  type ArticleSummary,
} from "@/modules/content/domain/models";
import type { ContentRepository } from "@/modules/content/application/repository";
import {
  articlesTable as a,
  notesTable as n,
  projectsTable as p,
  quotesTable as q,
} from "./schema";
const summaryColumns = {
  locale: a.locale,
  slug: a.slug,
  title: a.title,
  excerpt: a.excerpt,
  category: a.category,
  tags: a.tags,
  minutes: a.minutes,
  sketch: a.sketch,
  publishedAt: a.publishedAt,
  updatedAt: a.updatedAt,
};
const articleColumns = {
  ...summaryColumns,
  sections: a.sections,
  body: a.body,
};
type ArticleRow = Pick<
  typeof a.$inferSelect,
  keyof typeof articleColumns | "publication"
>;
const publicationRetryAt = new WeakMap<Database, number>();
function parseArticle(row: ArticleRow) {
  return articleSchema.parse({
    ...summary(row),
    sections: row.sections,
    body: row.body ?? undefined,
    publication: row.publication ?? undefined,
  });
}
function summary(
  row:
    | typeof a.$inferSelect
    | ({ publishedAt: Date | null; updatedAt: Date } & Record<string, unknown>),
): ArticleSummary {
  return articleSummarySchema.parse({
    ...row,
    date: dateKey(row.publishedAt!),
    updatedAt: row.updatedAt.toISOString(),
  });
}
const published = (table: {
  visibility: AnyPgColumn;
  publishedAt: AnyPgColumn;
}) =>
  and(eq(table.visibility, "published"), lte(table.publishedAt, new Date()));
export function postgresContentRepository(
  db: Database = getDb(),
): ContentRepository {
  return {
    latestNote: async (locale) => {
      const [row] = await db
        .select({
          mood: n.mood,
          text: n.text,
          tag: n.tag,
          publishedOn: n.publishedOn,
        })
        .from(n)
        .where(and(published(n), eq(n.locale, locale)))
        .orderBy(desc(n.publishedOn), asc(n.id))
        .limit(1);
      return row
        ? {
            mood: row.mood,
            text: row.text,
            tag: row.tag,
            date: formatDate(row.publishedOn, locale),
          }
        : null;
    },
    projectPreviews: (locale) =>
      db
        .select({ id: p.id, name: p.name, subtitle: p.subtitle })
        .from(p)
        .where(and(published(p), eq(p.locale, locale)))
        .orderBy(asc(p.sortOrder), asc(p.id))
        .limit(3),
    firstQuote: async (locale) => {
      const [row] = await db
        .select({ text: q.text })
        .from(q)
        .where(and(published(q), eq(q.locale, locale)))
        .orderBy(asc(q.sortOrder), asc(q.id))
        .limit(1);
      return row ?? null;
    },
    visibleIds: async (type, ids, locale) => {
      if (!ids.length) return [];
      const table = { article: a, note: n, project: p }[type];
      const id = table === a ? a.slug : type === "note" ? n.id : p.id;
      const rows = await db
        .select({ id })
        .from(table)
        .where(
          and(published(table), eq(table.locale, locale), inArray(id, ids)),
        );
      return rows.map((row) => row.id);
    },
    allArticles: async (locale) =>
      (
        await db
          .select(summaryColumns)
          .from(a)
          .where(and(published(a), eq(a.locale, locale)))
          .orderBy(desc(a.publishedAt), asc(a.slug))
      ).map(summary),
    articleBySlug: async (slug, locale) => {
      const where = and(published(a), eq(a.slug, slug), eq(a.locale, locale));
      if (Date.now() >= (publicationRetryAt.get(db) ?? 0)) {
        try {
          const [row] = await db
            .select({ ...articleColumns, publication: a.publication })
            .from(a)
            .where(where)
            .limit(1);
          publicationRetryAt.delete(db);
          return row ? parseArticle(row) : null;
        } catch (error) {
          if (!isUndefinedColumn(error)) throw error;
          publicationRetryAt.set(db, Date.now() + 30_000);
        }
      }
      // During rollout, old schemas can still serve all existing articles.
      const [legacy] = await db
        .select(articleColumns)
        .from(a)
        .where(where)
        .limit(1);
      return legacy ? parseArticle({ ...legacy, publication: null }) : null;
    },
    articleLocales: async (slug) =>
      (
        await db
          .select({ locale: a.locale })
          .from(a)
          .where(and(published(a), eq(a.slug, slug)))
      ).map((row) => row.locale),
    nextArticle: async (slug, locale) => {
      const cursor = db
        .select({ publishedAt: a.publishedAt })
        .from(a)
        .where(and(eq(a.slug, slug), eq(a.locale, locale)))
        .as("cursor");
      const [next] = await db
        .select({ slug: a.slug, title: a.title })
        .from(a)
        .innerJoin(cursor, sql`true`)
        .where(
          and(
            published(a),
            eq(a.locale, locale),
            or(
              lt(a.publishedAt, cursor.publishedAt),
              and(eq(a.publishedAt, cursor.publishedAt), gt(a.slug, slug)),
            ),
          ),
        )
        .orderBy(desc(a.publishedAt), asc(a.slug))
        .limit(1);
      return next;
    },
    listArticles: async (query) => {
      const pattern = `%${query.q.replace(/[\\%_]/g, "\\$&")}%`;
      const where = and(
        published(a),
        eq(a.locale, query.locale),
        query.category ? eq(a.category, query.category) : undefined,
        query.q
          ? or(
              ilike(a.title, pattern),
              ilike(a.excerpt, pattern),
              sql`array_to_string(${a.tags}, ' ') ilike ${pattern}`,
            )
          : undefined,
      );
      const page = db
        .select(summaryColumns)
        .from(a)
        .where(where)
        .orderBy(desc(a.publishedAt), asc(a.slug))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize)
        .as("page");
      const totals = db
        .select({ total: count().as("total") })
        .from(a)
        .where(where)
        .as("totals");
      // One statement shares a PostgreSQL snapshot, even when the page is empty.
      const rows = await db
        .select({
          total: totals.total,
          item: {
            locale: page.locale,
            slug: page.slug,
            title: page.title,
            excerpt: page.excerpt,
            category: page.category,
            tags: page.tags,
            minutes: page.minutes,
            sketch: page.sketch,
            publishedAt: page.publishedAt,
            updatedAt: page.updatedAt,
          },
        })
        .from(totals)
        .leftJoin(page, sql`true`)
        .orderBy(desc(page.publishedAt), asc(page.slug));
      const total = rows[0].total;
      return {
        items: rows.flatMap(({ item }) => (item ? [summary(item)] : [])),
        total,
        page: query.page,
        pageSize: query.pageSize,
        pageCount: Math.ceil(total / query.pageSize),
      };
    },
    notes: async (locale) =>
      (
        await db
          .select()
          .from(n)
          .where(and(published(n), eq(n.locale, locale)))
          .orderBy(desc(n.publishedOn), asc(n.id))
      ).map((row) => ({
        locale: row.locale,
        id: row.id,
        date: formatDate(row.publishedOn, locale),
        publishedOn: row.publishedOn,
        mood: row.mood,
        images: noteImagesSchema.parse(row.images),
        text: row.text,
        body: row.body ?? undefined,
        tag: row.tag,
        sketch: row.sketch,
      })),
    projects: async (locale) =>
      (
        await db
          .select()
          .from(p)
          .where(and(published(p), eq(p.locale, locale)))
          .orderBy(asc(p.sortOrder), asc(p.id))
      ).map(
        ({
          locale,
          id,
          name,
          subtitle,
          category,
          status,
          description,
          body,
          stack,
          sketch,
          color,
        }) => ({
          locale,
          id,
          name,
          subtitle,
          category,
          status,
          description,
          body: body ?? undefined,
          stack,
          sketch,
          color,
        }),
      ),
    quotes: async (locale) =>
      (
        await db
          .select()
          .from(q)
          .where(and(published(q), eq(q.locale, locale)))
          .orderBy(asc(q.sortOrder), asc(q.id))
      ).map(({ id, locale, text, author }) => ({ id, locale, text, author })),
  };
}
