import { getLocale } from "next-intl/server";
import { HomeView } from "@/modules/home/ui/HomeView";
import { listNotes, getFirstQuote } from "@/modules/content/server";
import { getPageMetadata } from "@/server/seo/metadata";
import {
  getPublicHomeCopy,
  getConfiguredFeaturedArticles,
} from "@/modules/site-settings/server";
export const generateMetadata = () => getPageMetadata("/");
export default async function Page() {
  const locale = await getLocale();
  const [articles, notes, quote, homeCopy] = await Promise.all([
    getConfiguredFeaturedArticles(locale),
    listNotes(locale, 4),
    getFirstQuote(locale),
    getPublicHomeCopy(locale),
  ]);
  return (
    <HomeView
      articles={articles.items}
      total={articles.total}
      notes={notes}
      quote={quote}
      homeCopy={homeCopy}
    />
  );
}
