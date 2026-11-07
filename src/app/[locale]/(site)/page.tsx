import { getLocale } from "next-intl/server";
import { HomeView } from "@/modules/home/ui/HomeView";
import {
  getFeaturedArticles,
  getLatestNote,
  getFirstQuote,
} from "@/modules/content/server";
import { getPageMetadata } from "@/server/seo/metadata";
export const generateMetadata = () => getPageMetadata("/");
export default async function Page() {
  const locale = await getLocale();
  const [articles, note, quote] = await Promise.all([
    getFeaturedArticles(locale),
    getLatestNote(locale),
    getFirstQuote(locale),
  ]);
  return (
    <HomeView
      articles={articles.items}
      total={articles.total}
      note={note}
      quote={quote}
    />
  );
}
