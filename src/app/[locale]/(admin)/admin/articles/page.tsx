import { ArticleManagerView } from "@/modules/content/ui/admin/ArticleManagerView";
import { getCurrentPrincipal } from "@/modules/identity/server";
import { workbenchRecords } from "@/server/workbench/records";
import { listEditorialArticles } from "@/modules/content/server/editorial-trash";
export default async function Page() {
  const principal = await getCurrentPrincipal();
  if (!principal || principal.role === "reader") return null;
  const [drafts, published] = await Promise.all([
    workbenchRecords().read(principal.id, "articles"),
    listEditorialArticles(principal.id, principal.role === "admin"),
  ]);
  return (
    <ArticleManagerView
      initialItems={drafts.value ?? []}
      published={published}
    />
  );
}
