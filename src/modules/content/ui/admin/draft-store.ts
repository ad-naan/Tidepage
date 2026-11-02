import {
  readWorkbenchRecord,
  updateWorkbenchRecord,
} from "@/shared/lib/workbench-store";
import {
  articleDraftSchema,
  type ArticleDraft,
} from "@/modules/content/domain/editor-document";
export async function loadArticleDrafts(
  includeDeleted = false,
): Promise<ArticleDraft[]> {
  const value = await readWorkbenchRecord("articles");
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
  const items = await updateWorkbenchRecord("articles", (raw) => {
    const items =
      raw === undefined ? [] : articleDraftSchema.array().parse(raw);
    const previous = items.find((item) => item.id === draft.id);
    if (previous && previous.revision !== draft.revision)
      throw new Error("DRAFT_CONFLICT");
    const saved = articleDraftSchema.parse({
      ...draft,
      revision: draft.revision + 1,
      updatedAt: new Date().toISOString(),
    });
    return [saved, ...items.filter((item) => item.id !== draft.id)];
  });
  return items.find((item) => item.id === draft.id)!;
}
