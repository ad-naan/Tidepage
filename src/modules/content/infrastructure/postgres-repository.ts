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
import { getDb, type Database } from "@/server/db/client";
import { publicListRank } from "@/server/db/public-list-rank";
import { dateKey, formatDate } from "@/shared/lib/date-time";
import {
  noteImageSchema,
  noteImagesSchema,
} from "@/modules/content/domain/note-images";
import type { Locale } from "@/shared/i18n/config";
import {
  articleSchema,
  articleSummarySchema,
  type ArticleSummary,
  type Note,
  type NoteListEntry,
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
  publication: a.publication,
};
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
export const published = (table: {
  visibility: AnyPgColumn;
  publishedAt: AnyPgColumn;
}) =>
  and(eq(table.visibility, "published"), lte(table.publishedAt, new Date()));
function fullNote(row: typeof n.$inferSelect): Note {
  return {
    locale: row.locale,
    id: row.id,
    date: formatDate(row.publishedOn, row.locale),
    publishedOn: row.publishedOn,
    mood: row.mood,
    images: noteImagesSchema.parse(row.images),
    text: row.text,
    body: row.body ?? undefined,
    tag: row.tag,
    sketch: row.sketch,
  };
}
export function postgresContentRepository(
  db: Database = getDb(),
): ContentRepository & {
  listNotes(locale: Locale, limit?: number): Promise<NoteListEntry[]>;
  noteById(id: string, locale: Locale): Promise<Note | null>;
} {
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
        .orderBy(
          publicListRank("notes", locale, n.id),
          desc(n.publishedOn),
          asc(n.id),
        )
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
        .orderBy(
          publicListRank("projects", locale, p.id),
          asc(p.sortOrder),
          asc(p.id),
        )
        .limit(3),
    firstQuote: async (locale) => {
      const [row] = await db
        .select({ text: q.text })
        .from(q)
        .where(and(published(q), eq(q.locale, locale)))
        .orderBy(
          publicListRank("quotes", locale, q.id),
          asc(q.sortOrder),
          asc(q.id),
        )
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
          .orderBy(
            publicListRank("articles", locale, a.slug),
            desc(a.publishedAt),
            asc(a.slug),
          )
      ).map(summary),
    articleBySlug: async (slug, locale) => {
      const [row] = await db
        .select(articleColumns)
        .from(a)
        .where(and(published(a), eq(a.slug, slug), eq(a.locale, locale)))
        .limit(1);
      return row
        ? articleSchema.parse({
            ...summary(row),
            sections: row.sections,
            body: row.body ?? undefined,
            publication: row.publication ?? undefined,
          })
        : null;
    },
    articleLocales: async (slug) =>
      (
        await db
          .select({ locale: a.locale })
          .from(a)
          .where(and(published(a), eq(a.slug, slug)))
      ).map((row) => row.locale),
    nextArticle: async (slug, locale) => {
      const rank = publicListRank("articles", locale, a.slug);
      const cursor = db
        .select({ publishedAt: a.publishedAt, rank: rank.as("rank") })
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
              gt(rank, cursor.rank),
              and(
                eq(rank, cursor.rank),
                or(
                  lt(a.publishedAt, cursor.publishedAt),
                  and(eq(a.publishedAt, cursor.publishedAt), gt(a.slug, slug)),
                ),
              ),
            ),
          ),
        )
        .orderBy(rank, desc(a.publishedAt), asc(a.slug))
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
      const rank = publicListRank("articles", query.locale, a.slug);
      const page = db
        .select({ ...summaryColumns, rank: rank.as("rank") })
        .from(a)
        .where(where)
        .orderBy(rank, desc(a.publishedAt), asc(a.slug))
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
        .orderBy(page.rank, desc(page.publishedAt), asc(page.slug));
      const total = rows[0].total;
      return {
        items: rows.flatMap(({ item }) => (item ? [summary(item)] : [])),
        total,
        page: query.page,
        pageSize: query.pageSize,
        pageCount: Math.ceil(total / query.pageSize),
      };
    },
    listNotes: async (locale, limit) => {
      const query = db
        .select({
          locale: n.locale,
          id: n.id,
          publishedOn: n.publishedOn,
          mood: n.mood,
          text: sql<string>`left(${n.text}, 180)`,
          truncated: sql<boolean>`length(${n.text}) > 180`,
          imageCount: sql<number>`jsonb_array_length(${n.images})`,
          cover: sql<unknown>`case when jsonb_array_length(${n.images}) > 0 then jsonb_build_object('assetId', ${n.images}->0->>'assetId', 'alt', ${n.images}->0->>'alt') end`,
          tag: n.tag,
          sketch: n.sketch,
        })
        .from(n)
        .where(and(published(n), eq(n.locale, locale)))
        .orderBy(
          publicListRank("notes", locale, n.id),
          desc(n.publishedOn),
          asc(n.id),
        );
      const rows = await (limit === undefined ? query : query.limit(limit));
      return rows.map((row) => ({
        ...row,
        date: formatDate(row.publishedOn, locale),
        cover: noteImageSchema
          .pick({ assetId: true, alt: true })
          .nullable()
          .parse(row.cover),
      }));
    },
    noteById: async (id, locale) => {
      const [row] = await db
        .select()
        .from(n)
        .where(and(published(n), eq(n.locale, locale), eq(n.id, id)))
        .limit(1);
      return row ? fullNote(row) : null;
    },
    notes: async (locale) =>
      (
        await db
          .select()
          .from(n)
          .where(and(published(n), eq(n.locale, locale)))
          .orderBy(
            publicListRank("notes", locale, n.id),
            desc(n.publishedOn),
            asc(n.id),
          )
      ).map(fullNote),
    projects: async (locale) =>
      (
        await db
          .select()
          .from(p)
          .where(and(published(p), eq(p.locale, locale)))
          .orderBy(
            publicListRank("projects", locale, p.id),
            asc(p.sortOrder),
            asc(p.id),
          )
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
          .orderBy(
            publicListRank("quotes", locale, q.id),
            asc(q.sortOrder),
            asc(q.id),
          )
      ).map(({ id, locale, text, author }) => ({ id, locale, text, author })),
  };
}
