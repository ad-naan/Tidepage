import "server-only";
import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Database } from "@/server/db/client";
import { workbenchRecordsTable as records } from "@/server/workbench/schema";
import {
  conflictError,
  notFoundError,
  validationError,
} from "@/server/http/errors";
import { localeSchema } from "@/shared/i18n/schema";
import { isUploadedAssetId } from "@/shared/contracts/asset-path";
import { parseSiteDateTime } from "@/shared/lib/date-time";
import {
  articleDraftSchema,
  publicationIssues,
  translationOf,
  type EditorNode,
} from "@/modules/content/domain/editor-document";
import { articlesTable as articles } from "@/modules/content/infrastructure/schema";
import { requireOwnedAssets } from "@/modules/media/server";

const publicationRequest = z
  .object({
    id: z.string().min(1).max(128),
    locale: localeSchema,
    revision: z.number().int().positive(),
  })
  .strict();

export async function publishArticle(
  ownerId: string,
  input: unknown,
  db: Database = getDb(),
) {
  const { id, locale, revision } = publicationRequest.parse(input);
  return db.transaction(async (tx) => {
    const [record] = await tx
      .select({ value: records.value })
      .from(records)
      .where(and(eq(records.ownerId, ownerId), eq(records.key, "articles")))
      .for("update");
    const draft =
      record &&
      articleDraftSchema
        .array()
        .parse(record.value)
        .find((item) => item.id === id && !item.deletedAt);
    if (!draft) throw notFoundError();
    if (draft.revision !== revision) throw conflictError();
    const issues = publicationIssues(draft, locale);
    if (issues.length) throw validationError({ fields: issues });
    const translation = translationOf(draft, locale);
    const { slug } = translation;
    const owned = and(
      eq(articles.sourceOwner, ownerId),
      eq(articles.sourceDraft, id),
    );
    const [previous] = await tx
      .select({
        slug: articles.slug,
        publishedAt: articles.publishedAt,
        revision: articles.sourceRevision,
      })
      .from(articles)
      .where(and(owned, eq(articles.locale, locale)))
      .limit(1);
    if (previous && previous.slug !== slug) throw conflictError();
    if (previous?.revision === revision) return { slug, locale };

    const assetIds = new Set<string>();
    if (draft.coverAssetId) assetIds.add(draft.coverAssetId);
    function collectAssets(node: EditorNode) {
      const asset =
        node.type === "assetImage"
          ? node.attrs?.assetId
          : node.type === "referenceCard"
            ? node.attrs?.artworkAssetId
            : undefined;
      if (typeof asset === "string" && asset) assetIds.add(asset);
      node.content?.forEach(collectAssets);
    }
    collectAssets(translation.body);
    if ([...assetIds].some((asset) => !isUploadedAssetId(asset)))
      throw validationError();
    await requireOwnedAssets(ownerId, [...assetIds], tx as unknown as Database);

    const legacy =
      id === `import-${slug}` ? isNull(articles.sourceOwner) : undefined;
    const now = new Date();
    const publishedAt = draft.publishedAt
      ? parseSiteDateTime(draft.publishedAt)!
      : (previous?.publishedAt ?? now);
    const value = {
      slug,
      locale,
      title: translation.title.trim(),
      excerpt: translation.excerpt.trim(),
      category: draft.category,
      tags: [
        ...new Set(translation.tags.map((tag) => tag.trim()).filter(Boolean)),
      ],
      minutes: draft.minutes,
      sketch: draft.sketch,
      sections: [],
      body: translation.body,
      publication: {
        author: draft.author.trim(),
        seoTitle: translation.seoTitle.trim(),
        seoDescription: translation.seoDescription.trim(),
        publishedAt: publishedAt.toISOString(),
        ...(draft.coverAssetId
          ? {
              cover: {
                assetId: draft.coverAssetId,
                alt: translation.coverAlt.trim(),
              },
            }
          : {}),
      },
      visibility: "published" as const,
      publishedAt,
      updatedAt: now,
      sourceOwner: ownerId,
      sourceDraft: id,
      sourceRevision: revision,
    };
    const [published] = await tx
      .insert(articles)
      .values(value)
      .onConflictDoUpdate({
        target: [articles.slug, articles.locale],
        set: value,
        setWhere: or(owned, legacy),
      })
      .returning({ slug: articles.slug, locale: articles.locale });
    if (!published) throw conflictError();
    return published;
  });
}
