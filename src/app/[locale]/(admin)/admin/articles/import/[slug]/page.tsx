import { notFound } from "next/navigation";
import { getArticle, getArticleLocales } from "@/modules/content/server";
import { legacyArticlesToDraft } from "@/modules/content/domain/legacy-draft";
import { slugSchema, type Article } from "@/modules/content/domain/models";
import { ArticleEditorView } from "@/modules/content/ui/admin/ArticleEditorView";
import { isEditorialAgentConfigured } from "@/modules/ai/server";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success) notFound();
  const available = await getArticleLocales(slug);
  const articles = (
    await Promise.all(available.map((locale) => getArticle(slug, locale)))
  ).filter((item): item is Article => item !== null);
  if (!articles.length) notFound();
  const draft = legacyArticlesToDraft(articles);
  return (
    <ArticleEditorView
      id={draft.id}
      initialDraft={draft}
      aiEnabled={isEditorialAgentConfigured()}
    />
  );
}
