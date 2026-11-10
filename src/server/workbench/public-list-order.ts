import "server-only";
import { and, asc, desc, eq, lte, sql } from "drizzle-orm";
import type { SQLWrapper } from "drizzle-orm";
import { getDb, type Database } from "@/server/db/client";
import { conflictError } from "@/server/http/errors";
import { publicListOrdersTable as orders } from "@/server/db/public-list-order-schema";
import { publicListRank } from "@/server/db/public-list-rank";
import {
  articlesTable as articles,
  notesTable as notes,
  projectsTable as projects,
  quotesTable as quotes,
  galleryPhotosTable as gallery,
} from "@/modules/content/infrastructure/schema";
import { friendsTable as friends } from "@/modules/friends/infrastructure/schema";
import {
  publicListOrderSchema,
  type PublicListKind,
  type PublicListOrder,
} from "@/shared/contracts/public-list-order";
import type { Locale } from "@/shared/i18n/config";

const lists = {
  articles: {
    table: articles,
    id: articles.slug,
    title: articles.title,
    fallback: [desc(articles.publishedAt)],
  },
  notes: {
    table: notes,
    id: notes.id,
    title: notes.text,
    fallback: [desc(notes.publishedOn)],
  },
  projects: {
    table: projects,
    id: projects.id,
    title: projects.name,
    fallback: [asc(projects.sortOrder)],
  },
  quotes: {
    table: quotes,
    id: quotes.id,
    title: quotes.text,
    fallback: [asc(quotes.sortOrder)],
  },
  gallery: {
    table: gallery,
    id: gallery.id,
    title: gallery.title,
    fallback: [asc(gallery.sortOrder), desc(gallery.publishedOn)],
  },
  friends: {
    table: friends,
    id: friends.id,
    title: friends.name,
    fallback: [asc(friends.sortOrder)],
  },
} satisfies Record<
  PublicListKind,
  {
    table: SQLWrapper;
    id: SQLWrapper;
    title: SQLWrapper;
    fallback: SQLWrapper[];
  }
>;

async function itemsFor(kind: PublicListKind, locale: Locale, db: Database) {
  const { table, id, title, fallback } = lists[kind];
  return db
    .select({ id, title: sql<string>`left(${title}, 180)` })
    .from(table)
    .where(
      and(
        eq(table.locale, locale),
        "visibility" in table
          ? and(
              eq(table.visibility, "published"),
              lte(table.publishedAt, new Date()),
            )
          : undefined,
      ),
    )
    .orderBy(publicListRank(kind, locale, id), ...fallback, asc(id));
}

export async function readPublicListOrder(
  kind: PublicListKind,
  locale: Locale,
  db: Database = getDb(),
): Promise<PublicListOrder> {
  const [record] = await db
    .select({ revision: orders.revision })
    .from(orders)
    .where(and(eq(orders.kind, kind), eq(orders.locale, locale)));
  return {
    revision: record?.revision ?? 0,
    items: await itemsFor(kind, locale, db),
  };
}

export async function savePublicListOrder(
  raw: unknown,
  db: Database = getDb(),
) {
  const { kind, locale, revision, ids } = publicListOrderSchema.parse(raw);
  return db.transaction(async (tx) => {
    const current = await itemsFor(kind, locale, tx as unknown as Database);
    const requested = new Set(ids);
    if (
      requested.size !== ids.length ||
      requested.size !== current.length ||
      current.some(({ id }) => !requested.has(id))
    )
      throw conflictError();
    const next = {
      revision: revision + 1,
      ranks: Object.fromEntries(ids.map((id, index) => [id, index])),
    };
    const [saved] =
      revision === 0
        ? await tx
            .insert(orders)
            .values({ kind, locale, ...next })
            .onConflictDoNothing()
            .returning({ revision: orders.revision })
        : await tx
            .update(orders)
            .set(next)
            .where(
              and(
                eq(orders.kind, kind),
                eq(orders.locale, locale),
                eq(orders.revision, revision),
              ),
            )
            .returning({ revision: orders.revision });
    if (!saved) throw conflictError();
    return { kind, locale, revision: saved.revision };
  });
}
