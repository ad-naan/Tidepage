import { getLocale } from "next-intl/server";
import { HomeView } from "@/modules/home/ui/HomeView";
import { getLatestNote, getFirstQuote } from "@/modules/content/server";
import { getPageMetadata } from "@/server/seo/metadata";
import {
  getPublicHomeCopy,
  getConfiguredFeaturedArticles,
} from "@/modules/site-settings/server";
export const generateMetadata = () => getPageMetadata("/");
export default async function Page() {
  const locale = await getLocale();
  const [articles, note, quote, homeCopy] = await Promise.all([
    getConfiguredFeaturedArticles(locale),
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
