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
    allArticles: async () =>
      (
        await db
          .select(summaryColumns)
          .from(a)
          .where(published(a))
          .orderBy(desc(a.publishedAt), asc(a.slug))
      ).map(summary),
    articleBySlug: async (slug) => {
      const [row] = await db
        .select()
        .from(a)
        .where(and(published(a), eq(a.slug, slug)))
        .limit(1);
      return row
        ? articleSchema.parse({ ...summary(row), sections: row.sections })
        : null;
    },
    listArticles: async (query) => {
      const pattern = `%${query.q.replace(/[\\%_]/g, "\\$&")}%`;
      const where = and(
        published(a),
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
    notes: async () =>
      (
        await db
          .select()
          .from(n)
          .where(published(n))
          .orderBy(desc(n.publishedOn), asc(n.id))
      ).map((row) => ({
        id: row.id,
        date: `${Number(row.publishedOn.slice(5, 7))} 月 ${row.publishedOn.slice(8)} 日`,
        publishedOn: row.publishedOn,
        mood: row.mood,
        text: row.text,
        tag: row.tag,
        sketch: row.sketch,
      })),
    projects: async () =>
      (
        await db
          .select()
          .from(p)
          .where(published(p))
          .orderBy(asc(p.sortOrder), asc(p.id))
      ).map(
        ({
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
    quotes: async () =>
      (
        await db
          .select()
          .from(q)
          .where(published(q))
          .orderBy(asc(q.sortOrder), asc(q.id))
      ).map(({ id, text, author }) => ({ id, text, author })),
  };
}
