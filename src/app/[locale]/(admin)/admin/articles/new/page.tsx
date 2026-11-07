import { ArticleEditorView } from "@/modules/content/ui/admin/ArticleEditorView";
import { isEditorialAgentConfigured } from "@/modules/ai/server";
export default function Page() {
  return <ArticleEditorView aiEnabled={isEditorialAgentConfigured()} />;
}
