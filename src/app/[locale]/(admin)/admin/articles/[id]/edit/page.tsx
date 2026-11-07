import { ArticleEditorView } from "@/modules/content/ui/admin/ArticleEditorView";
import { isEditorialAgentConfigured } from "@/modules/ai/server";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ArticleEditorView id={id} aiEnabled={isEditorialAgentConfigured()} />;
}
