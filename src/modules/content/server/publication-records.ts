import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, type Database } from "@/server/db/client";
import { workbenchRecordsTable as records } from "@/server/workbench/schema";
import { notFoundError, conflictError } from "@/server/http/errors";
import { articleDraftSchema } from "@/modules/content/domain/editor-document";
import type { PublicationRequest } from "@/modules/content/domain/publication";
import { articlesTable as articles } from "@/modules/content/infrastructure/schema";

export async function requirePublicationDraft(
  ownerId: string,
  request: PublicationRequest,
  db: Database = getDb(),
  lock = false,
) {
  const query = db
    .select({ value: records.value })
    .from(records)
    .where(and(eq(records.ownerId, ownerId), eq(records.key, "articles")));
  const [record] = await (lock ? query.for("update") : query);
  const draft =
    record &&
    articleDraftSchema
      .array()
      .parse(record.value)
      .find((item) => item.id === request.id && !item.deletedAt);
  if (!draft) throw notFoundError();
  if (draft.revision !== request.revision) throw conflictError();
  return draft;
}

export function articleDraftSource(ownerId: string, draftId: string) {
  return and(
    eq(articles.sourceOwner, ownerId),
    eq(articles.sourceDraft, draftId),
  );
}

export async function readDraftPublication(
  ownerId: string,
  request: PublicationRequest,
  db: Database = getDb(),
) {
  const [previous] = await db
    .select({
      slug: articles.slug,
      publishedAt: articles.publishedAt,
      revision: articles.sourceRevision,
    })
    .from(articles)
    .where(
      and(
        articleDraftSource(ownerId, request.id),
        eq(articles.locale, request.locale),
      ),
    )
    .limit(1);
  return previous;
}
