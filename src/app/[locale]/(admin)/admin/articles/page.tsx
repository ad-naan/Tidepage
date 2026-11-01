import { ArticleManagerView } from "@/modules/content/ui/admin/ArticleManagerView";
import { getLocale } from "next-intl/server";
import { getArticles } from "@/modules/content/server";
export default async function Page() {
  return (
    <ArticleManagerView published={await getArticles(await getLocale())} />
  );
}
