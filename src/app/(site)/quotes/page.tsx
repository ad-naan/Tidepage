import { QuotesView } from "@/modules/content/ui/QuotesView";
import { getQuotes } from "@/modules/content/server";
import { pageMetadata } from "@/server/seo/metadata";
export const metadata = pageMetadata("/quotes", "一言", "留给下一页的话。");
export default async function Page() {
  const quotes = await getQuotes();
  return <QuotesView quotes={quotes} />;
}
