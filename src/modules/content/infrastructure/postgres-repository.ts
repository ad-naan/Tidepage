import "server-only";
import { and, asc, count, desc, eq, ilike, lte, or, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { getDb, type Database } from "@/server/db/client";
import { articleSchema, type ArticleSummary } from "../domain/models";
import type { ContentRepository } from "../application/repository";
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
const summarySchema = articleSchema.omit({ sections: true });
function summary(
  row:
    | typeof a.$inferSelect
    | ({ publishedAt: Date | null; updatedAt: Date } & Record<string, unknown>),
): ArticleSummary {
  return summarySchema.parse({
    ...row,
    date: row.publishedAt!.toISOString().slice(0, 10),
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
    allArticles: async (locale) =>
      (
        await db
          .select(summaryColumns)
          .from(a)
          .where(and(published(a), eq(a.locale, locale)))
          .orderBy(desc(a.publishedAt), asc(a.slug))
      ).map(summary),
    articleBySlug: async (slug, locale) => {
      const [row] = await db
        .select()
        .from(a)
        .where(and(published(a), eq(a.slug, slug), eq(a.locale, locale)))
        .limit(1);
      return row
        ? articleSchema.parse({ ...summary(row), sections: row.sections })
        : null;
    },
    articleLocales: async (slug) => (await db.select({locale:a.locale}).from(a).where(and(published(a),eq(a.slug,slug)))).map(row=>row.locale),
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
      return db.transaction(
        async (tx) => {
          const items = await tx
            .select(summaryColumns)
            .from(a)
            .where(where)
            .orderBy(desc(a.publishedAt), asc(a.slug))
            .limit(query.pageSize)
            .offset((query.page - 1) * query.pageSize);
          const [result] = await tx
            .select({ total: count() })
            .from(a)
            .where(where);
          return {
            items: items.map(summary),
            total: result.total,
            page: query.page,
            pageSize: query.pageSize,
            pageCount: Math.ceil(result.total / query.pageSize),
          };
        },
        { isolationLevel: "repeatable read", accessMode: "read only" },
      );
    },
    notes: async (locale) =>
      (
        await db
          .select()
          .from(n)
          .where(and(published(n),eq(n.locale,locale)))
          .orderBy(desc(n.publishedOn), asc(n.id))
      ).map((row) => ({
        locale: row.locale,
        id: row.id,
        date: new Intl.DateTimeFormat(locale,{month:"long",day:"2-digit",timeZone:"UTC"}).format(new Date(row.publishedOn)),
        publishedOn: row.publishedOn,
        mood: row.mood,
        text: row.text,
        tag: row.tag,
        sketch: row.sketch,
      })),
    projects: async (locale) =>
      (
        await db
          .select()
          .from(p)
          .where(and(published(p),eq(p.locale,locale)))
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
          .where(and(published(q),eq(q.locale,locale)))
          .orderBy(asc(q.sortOrder), asc(q.id))
      ).map(({ id, locale, text, author }) => ({ id, locale, text, author })),
  };
}
