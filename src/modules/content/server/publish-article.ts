import "server-only";
import { isNull, or } from "drizzle-orm";
import { normalizeTags } from "@/modules/content/domain/tags";
import { getDb, type Database } from "@/server/db/client";
import { conflictError, validationError } from "@/server/http/errors";
import { isUploadedAssetId } from "@/shared/contracts/asset-path";
import {
  publicationIssues,
  translationOf,
  type EditorNode,
} from "@/modules/content/domain/editor-document";
import { articlesTable as articles } from "@/modules/content/infrastructure/schema";
import { requireOwnedAssets } from "@/modules/media/server";
import {
  publicationRequestSchema,
  publicationCopy,
  publicationDate,
} from "@/modules/content/domain/publication";
import {
  articleDraftSource,
  readDraftPublication,
  requirePublicationDraft,
} from "./publication-records";

export async function publishArticle(
  ownerId: string,
  input: unknown,
  db: Database = getDb(),
) {
  const request = publicationRequestSchema.parse(input);
  const { id, locale, revision } = request;
  return db.transaction(async (tx) => {
    const database = tx as unknown as Database;
    const draft = await requirePublicationDraft(
      ownerId,
      request,
      database,
      true,
    );
    const issues = publicationIssues(draft, locale);
    if (issues.length) throw validationError({ fields: issues });
    const translation = translationOf(draft, locale);
    const { slug } = translation;
    const owned = articleDraftSource(ownerId, id);
    const previous = await readDraftPublication(ownerId, request, database);
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
    await requireOwnedAssets(ownerId, [...assetIds], database);

    const legacy =
      id === `import-${slug}` ? isNull(articles.sourceOwner) : undefined;
    const now = new Date();
    const publishedAt = publicationDate(
      draft.publishedAt,
      previous?.publishedAt,
      now,
    )!;
    const { title, excerpt, seoTitle, seoDescription } =
      publicationCopy(translation);
    const value = {
      slug,
      locale,
      title,
      excerpt,
      category: draft.category,
      tags: normalizeTags(translation.tags),
      minutes: draft.minutes,
      sketch: draft.sketch,
      sections: [],
      body: translation.body,
      publication: {
        author: draft.author.trim(),
        ...(translation.afterword && { afterword: translation.afterword }),
        seoTitle,
        seoDescription,
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
