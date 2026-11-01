import { getLocale } from "next-intl/server";
import { HomeView } from "@/modules/home/ui/HomeView";
import { getArticles, getNotes } from "@/modules/content/server";
import { getPageMetadata } from "@/server/seo/metadata";
export const generateMetadata = () => getPageMetadata("/");
export default async function Page() {
  const locale = await getLocale();
  const [articles, notes] = await Promise.all([
    getArticles(locale),
    getNotes(locale),
  ]);
  return <HomeView articles={articles} notes={notes} />;
}
