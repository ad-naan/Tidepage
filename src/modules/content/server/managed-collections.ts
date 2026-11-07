import "server-only";
import { and, asc, desc, eq, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Database } from "@/server/db/client";
import { workbenchRecordsTable as records } from "@/server/workbench/schema";
import { conflictError, notFoundError } from "@/server/http/errors";
import { requireOwnedAssets } from "@/modules/media/server";
import type { EditorNode } from "@/shared/contracts/rich-text";
import { dateKey } from "@/shared/lib/date-time";
import {
  collectionPublicationSchema,
  managedItemSchema,
  type PublishedCollectionItem,
  type EditorialCollection,
} from "@/modules/content/domain/managed-collections";
import { sketchSchema } from "@/modules/content/domain/taxonomy";
import {
  notesTable as notes,
  projectsTable as projects,
  quotesTable as quotes,
} from "@/modules/content/infrastructure/schema";

const collectionTables = { notes, projects, quotes };
type Publication = z.infer<typeof collectionPublicationSchema>;
type Item = z.infer<typeof managedItemSchema>;

export async function listPublishedCollection(
  kind: EditorialCollection,
  db: Database = getDb(),
) {
  const table = collectionTables[kind];
  const title =
    kind === "notes"
      ? notes.text
      : kind === "projects"
        ? projects.name
        : quotes.text;
  const rows = await db
    .select({
      id: table.id,
      locale: table.locale,
      title: sql<string>`left(${title}, 140)`,
    })
    .from(table)
    .where(eq(table.visibility, "published"))
    .orderBy(desc(table.publishedAt), asc(table.id), asc(table.locale));
  const entries = new Map<string, PublishedCollectionItem>();
  for (const row of rows) {
    const entry = entries.get(row.id) ?? { id: row.id, titles: {} };
    entry.titles[row.locale] = row.title;
    entries.set(row.id, entry);
  }
  return [...entries.values()];
}

export async function openPublishedCollection(
  kind: EditorialCollection,
  id: string,
  db: Database = getDb(),
  scope?: { ownerId: string; adopt: boolean },
): Promise<Item> {
  const table = collectionTables[kind];
  const rows = await db
    .select()
    .from(table)
    .where(
      and(
        eq(table.id, id),
        eq(table.visibility, "published"),
        scope &&
          or(
            eq(table.sourceOwner, scope.ownerId),
            scope.adopt ? isNull(table.sourceOwner) : undefined,
          ),
      ),
    )
    .orderBy(asc(table.locale));
  const row = rows[0];
  if (!row) throw notFoundError();
  const translations: Item["translations"] = {};
  const images: Item["images"] = {};
  const documents: NonNullable<Item["documents"]> = {};
  for (const version of rows) {
    if ("body" in version && version.body)
      documents[version.locale] = version.body;
    if ("mood" in version) {
      translations[version.locale] = {
        text: version.text,
        mood: version.mood,
        tag: version.tag,
      };
      images[version.locale] = version.images;
    } else if ("name" in version) {
      translations[version.locale] = {
        name: version.name,
        subtitle: version.subtitle,
        description: version.description,
        status: version.status,
        stack: version.stack.join(", "),
      };
    } else
      translations[version.locale] = {
        text: version.text,
        author: version.author,
      };
  }
  return managedItemSchema.parse({
    id,
    translations,
    images,
    documents,
    revision: 0,
    updatedAt: row.updatedAt.toISOString(),
    publishedOn:
      "publishedOn" in row
        ? row.publishedOn
        : dateKey(row.publishedAt ?? row.createdAt),
    sortOrder: "sortOrder" in row ? row.sortOrder : 0,
    category: "category" in row ? row.category : "",
    sketch: "sketch" in row ? row.sketch : "boat",
    color: "color" in row ? row.color : "sand",
    assetId: "",
  });
}

export async function requireSavedCollection(
  db: Database,
  ownerId: string,
  kind: EditorialCollection,
  request: Publication,
) {
  const [record] = await db
    .select({ value: records.value })
    .from(records)
    .where(
      and(eq(records.ownerId, ownerId), eq(records.key, `collection:${kind}`)),
    )
    .for("update");
  const item =
    record &&
    managedItemSchema
      .array()
      .parse(record.value)
      .find((entry) => entry.id === request.id && !entry.deletedAt);
  if (!item) throw notFoundError();
  if (item.revision !== request.revision) throw conflictError();
  return item;
}

export async function requireCollectionAssets(
  ownerId: string,
  db: Database,
  body: EditorNode | null,
  ids: string[] = [],
) {
  const assets = new Set(ids);
  function visit(node: EditorNode) {
    const id =
      node.type === "assetImage"
        ? node.attrs?.assetId
        : node.type === "referenceCard"
          ? node.attrs?.artworkAssetId
          : undefined;
    if (typeof id === "string" && id) assets.add(id);
    node.content?.forEach(visit);
  }
  if (body) visit(body);
  await requireOwnedAssets(ownerId, [...assets], db, true);
}

export async function publishEditorialCollection(
  ownerId: string,
  kind: "projects" | "quotes",
  raw: unknown,
  db: Database = getDb(),
) {
  const request = collectionPublicationSchema.parse(raw);
  const { id, locale } = request;
  return db.transaction(async (tx) => {
    const database = tx as unknown as Database;
    const item = await requireSavedCollection(database, ownerId, kind, request);
    const copy = item.translations[locale] ?? {};
    const now = new Date();
    const common = {
      id,
      locale,
      sourceOwner: ownerId,
      sortOrder: z.int32().parse(item.sortOrder),
      visibility: "published" as const,
      publishedAt: now,
      updatedAt: now,
    };
    if (kind === "projects") {
      const body = item.documents?.[locale] ?? null;
      await requireCollectionAssets(ownerId, database, body);
      const value = {
        ...common,
        body,
        name: z.string().trim().min(1).max(200).parse(copy.name),
        subtitle: z
          .string()
          .trim()
          .max(240)
          .parse(copy.subtitle ?? ""),
        description: z
          .string()
          .trim()
          .max(50000)
          .parse(copy.description ?? ""),
        status: z
          .string()
          .trim()
          .max(100)
          .parse(copy.status ?? ""),
        stack: z
          .array(z.string().max(100))
          .max(40)
          .parse([
            ...new Set(
              (copy.stack ?? "")
                .split(/[,，]/)
                .map((s) => s.trim())
                .filter(Boolean),
            ),
          ]),
        category: z.string().trim().max(80).parse(item.category),
        sketch: sketchSchema.parse(item.sketch),
        color: z.enum(["sand", "sage", "peach"]).parse(item.color),
      };
      const [saved] = await tx
        .insert(projects)
        .values(value)
        .onConflictDoUpdate({
          target: [projects.id, projects.locale],
          set: {
            ...value,
            publishedAt: sql`coalesce(${projects.publishedAt}, excluded.published_at)`,
          },
          setWhere: or(
            isNull(projects.sourceOwner),
            eq(projects.sourceOwner, ownerId),
          ),
        })
        .returning({ id: projects.id });
      if (!saved) throw conflictError();
    } else {
      const value = {
        ...common,
        text: z.string().trim().min(1).max(5000).parse(copy.text),
        author: z
          .string()
          .trim()
          .max(200)
          .parse(copy.author ?? ""),
      };
      const [saved] = await tx
        .insert(quotes)
        .values(value)
        .onConflictDoUpdate({
          target: [quotes.id, quotes.locale],
          set: {
            ...value,
            publishedAt: sql`coalesce(${quotes.publishedAt}, excluded.published_at)`,
          },
          setWhere: or(
            isNull(quotes.sourceOwner),
            eq(quotes.sourceOwner, ownerId),
          ),
        })
        .returning({ id: quotes.id });
      if (!saved) throw conflictError();
    }
    return { id, locale };
  });
}
