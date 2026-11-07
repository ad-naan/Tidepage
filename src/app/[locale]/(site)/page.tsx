import { getLocale } from "next-intl/server";
import { HomeView } from "@/modules/home/ui/HomeView";
import {
  getFeaturedArticles,
  getLatestNote,
  getFirstQuote,
} from "@/modules/content/server";
import { getPageMetadata } from "@/server/seo/metadata";
import { getPublicHomeCopy } from "@/modules/site-settings/server";
export const generateMetadata = () => getPageMetadata("/");
export default async function Page() {
  const locale = await getLocale();
  const [articles, note, quote, homeCopy] = await Promise.all([
    getFeaturedArticles(locale),
    getLatestNote(locale),
    getFirstQuote(locale),
    getPublicHomeCopy(locale),
  ]);
  return (
    <HomeView
      articles={articles.items}
      total={articles.total}
      note={note}
      quote={quote}
      homeCopy={homeCopy}
    />
  );
}
