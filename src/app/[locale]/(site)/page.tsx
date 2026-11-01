import { getLocale } from "next-intl/server";
import { HomeView } from "@/modules/home/ui/HomeView";
import { getArticles, getNotes, getQuotes } from "@/modules/content/server";
import { getPageMetadata } from "@/server/seo/metadata";
export const generateMetadata = () => getPageMetadata("/");
export default async function Page() {
  const locale = await getLocale();
  const [articles, notes, quotes] = await Promise.all([
    getArticles(locale),
    getNotes(locale),
    getQuotes(locale),
  ]);
  return <HomeView articles={articles} notes={notes} quotes={quotes} />;
}
