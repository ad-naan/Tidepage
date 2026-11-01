import { readLocalRecord, writeLocalRecord } from "@/shared/lib/browser-store";
import {
  articleDraftSchema,
  type ArticleDraft,
} from "@/modules/content/domain/editor-document";
export async function loadArticleDrafts(
  includeDeleted = false,
): Promise<ArticleDraft[]> {
  const value = await readLocalRecord("articles");
  if (value === undefined) return [];
  return articleDraftSchema
    .array()
    .parse(value)
    .filter((item) => includeDeleted || !item.deletedAt);
}
/** Serialize writes and check the revision so two tabs never silently overwrite. */
export async function saveArticleDraft(
  draft: ArticleDraft,
): Promise<ArticleDraft> {
  return navigator.locks.request("tidepage:articles", async () => {
    const items = await loadArticleDrafts(true);
    const previous = items.find((item) => item.id === draft.id);
    if (previous && previous.revision !== draft.revision)
      throw new Error("DRAFT_CONFLICT");
    const saved = articleDraftSchema.parse({
      ...draft,
      revision: draft.revision + 1,
      updatedAt: new Date().toISOString(),
    });
    await writeLocalRecord("articles", [
      saved,
      ...items.filter((item) => item.id !== draft.id),
    ]);
    return saved;
  });
}
