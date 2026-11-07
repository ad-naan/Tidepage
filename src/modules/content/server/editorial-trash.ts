import "server-only";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Database } from "@/server/db/client";
import { conflictError, notFoundError } from "@/server/http/errors";
import { workbenchRecords } from "@/server/workbench/records";
import { dateKey } from "@/shared/lib/date-time";
import { legacyArticlesToDraft } from "@/modules/content/domain/legacy-draft";
import { articleSchema, slugSchema } from "@/modules/content/domain/models";
import {
  articlesTable as articles,
  notesTable as notes,
  projectsTable as projects,
  quotesTable as quotes,
} from "@/modules/content/infrastructure/schema";
import { articleDraftSource } from "./publication-records";
import { openPublishedCollection } from "./managed-collections";

export const trashRequestSchema = z
  .object({
    kind: z.enum(["articles", "notes", "projects", "quotes"]),
    id: z.string().min(1).max(140),
    revision: z.number().int().nonnegative(),
    remove: z.boolean(),
  })
  .strict();

export async function listEditorialArticles(
  ownerId: string,
  adopt: boolean,
  db: Database = getDb(),
) {
  return db
    .select({
      id: sql<string>`coalesce(${articles.sourceDraft}, 'import-' || ${articles.slug})`,
      slug: articles.slug,
      locale: articles.locale,
      title: articles.title,
    })
    .from(articles)
    .where(
      and(
        eq(articles.visibility, "published"),
        or(
          eq(articles.sourceOwner, ownerId),
          adopt ? isNull(articles.sourceOwner) : undefined,
        ),
      ),
    )
    .orderBy(desc(articles.publishedAt), articles.slug, articles.locale);
}

const collections = { notes, projects, quotes };

export async function changeEditorialTrash(
  ownerId: string,
  adopt: boolean,
  raw: unknown,
  db: Database = getDb(),
) {
  const { kind, id, revision, remove } = trashRequestSchema.parse(raw);
  return db.transaction(async (tx) => {
    const database = tx as unknown as Database;
    const store = workbenchRecords(database);
    const now = new Date().toISOString();
    function next<
      T extends {
        revision: number;
        deletedAt?: string;
        trashedLocales?: string[];
        updatedAt: string;
      },
    >(item: T, locales: NonNullable<T["trashedLocales"]>) {
      return {
        ...item,
        revision: item.revision + 1,
        updatedAt: now,
        deletedAt: remove ? now : undefined,
        trashedLocales: remove ? locales : undefined,
      };
    }
    function check(item: { revision: number; deletedAt?: string } | undefined) {
      if (
        (item?.revision ?? 0) !== revision ||
        (item && !!item.deletedAt === remove)
      )
        throw conflictError();
      if (!remove && !item) throw notFoundError();
    }
    if (kind === "articles") {
      const snapshot = await store.read(ownerId, kind, true);
      const current = snapshot.value ?? [];
      let item = current.find((entry) => entry.id === id);
      check(item);
      const legacySlug =
        adopt &&
        id.startsWith("import-") &&
        slugSchema.safeParse(id.slice(7)).data;
      const matches = or(
        articleDraftSource(ownerId, id),
        legacySlug
          ? and(isNull(articles.sourceOwner), eq(articles.slug, legacySlug))
          : undefined,
      );
      if (!item) {
        const rows = await tx
          .select()
          .from(articles)
          .where(and(matches, eq(articles.visibility, "published")))
          .for("update");
        if (!rows.length) throw notFoundError();
        item = legacyArticlesToDraft(
          rows.map((row) =>
            articleSchema.parse({
              ...row,
              date: dateKey(row.publishedAt!),
              updatedAt: row.updatedAt.toISOString(),
              publication: row.publication ?? undefined,
              body: row.body ?? undefined,
            }),
          ),
        );
        item.id = id;
      }
      const changed =
        remove || item.trashedLocales?.length
          ? await tx
              .update(articles)
              .set({
                visibility: remove ? "draft" : "published",
                sourceOwner: ownerId,
                sourceDraft: id,
              })
              .where(
                and(
                  matches,
                  remove
                    ? eq(articles.visibility, "published")
                    : and(
                        eq(articles.visibility, "draft"),
                        inArray(articles.locale, item.trashedLocales ?? []),
                      ),
                ),
              )
              .returning({ locale: articles.locale, slug: articles.slug })
          : [];
      const saved = next(
        item,
        changed.map(({ locale }) => locale),
      );
      await store.write(ownerId, kind, snapshot.revision, [
        saved,
        ...current.filter((entry) => entry.id !== id),
      ]);
      return { item: saved, changed };
    }
    const key = `collection:${kind}` as const;
    const snapshot = await store.read(ownerId, key, true);
    const current = snapshot.value ?? [];
    let item = current.find((entry) => entry.id === id);
    check(item);
    item ??= await openPublishedCollection(kind, id, database, {
      ownerId,
      adopt,
    });
    const table = collections[kind];
    const changed =
      remove || item.trashedLocales?.length
        ? await tx
            .update(table)
            .set({
              visibility: remove ? "draft" : "published",
              sourceOwner: ownerId,
            })
            .where(
              and(
                eq(table.id, id),
                or(
                  eq(table.sourceOwner, ownerId),
                  adopt ? isNull(table.sourceOwner) : undefined,
                ),
                remove
                  ? eq(table.visibility, "published")
                  : and(
                      eq(table.visibility, "draft"),
                      inArray(table.locale, item.trashedLocales ?? []),
                    ),
              ),
            )
            .returning({ locale: table.locale })
        : [];
    if (!revision && !changed.length) throw notFoundError();
    const saved = next(
      item,
      changed.map(({ locale }) => locale),
    );
    await store.write(ownerId, key, snapshot.revision, [
      saved,
      ...current.filter((entry) => entry.id !== id),
    ]);
    return { item: saved, changed };
  });
}
