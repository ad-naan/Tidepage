import { getLocale, getTranslations } from "next-intl/server";
import { QuotesView } from "@/modules/content/ui/QuotesView";
import { getQuotes } from "@/modules/content/server";
import { getPageMetadata } from "@/server/seo/metadata";
export const generateMetadata = () => getPageMetadata("/quotes");
export default async function Page() {
  const locale = await getLocale();
  const quotes = await getQuotes(locale);
  return <QuotesView quotes={quotes} />;
}
