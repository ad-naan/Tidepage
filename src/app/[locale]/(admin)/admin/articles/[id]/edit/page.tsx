import { ArticleEditorView } from "@/modules/content/ui/admin/ArticleEditorView";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ArticleEditorView id={id} />;
}
