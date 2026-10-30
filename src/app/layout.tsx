import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { getEnv } from "@/server/config/env";
import { localeRegistry } from "@/shared/i18n/config";
import { JsonLd } from "@/server/seo/JsonLd";
import { siteGraph } from "@/server/seo/structured-data";
import "../styles/globals.css";
import "../styles/refinements.css";
import "../styles/chrome.css";
import "../styles/header.css";
import "../styles/theme.css";
import "../styles/scrollbars.css";
import "../styles/celestial.css";
import "../styles/night.css";
import "../styles/playground.css";
import "../styles/atmosphere.css";
export async function generateMetadata():Promise<Metadata>{
  const locale=await getLocale();const t=await getTranslations("site");
  return {metadataBase:new URL(getEnv().SITE_URL),title:{default:t("name"),template:"%s · Tidepage"},description:t("description"),robots:{index:getEnv().INDEXING_ENABLED,follow:getEnv().INDEXING_ENABLED},alternates:{types:{"application/rss+xml":`/feed.xml?locale=${locale}`}}};
}
const gardenHand=localFont({src:"../../public/fonts/garden-hand.woff2",variable:"--font-hand",weight:"300",display:"swap"});
export default async function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  const locale=await getLocale();const messages=await getMessages();const t=await getTranslations("site");
  return <html lang={locale} dir={localeRegistry[locale].direction} className={gardenHand.variable} data-scroll-behavior="smooth"><body>
    <a href="#main-content" className="skip-link">{t("skip")}</a>
    <JsonLd data={siteGraph(locale, { name: t("name"), description: t("description") })}/>
    <NextIntlClientProvider locale={locale} messages={messages}>{children}</NextIntlClientProvider>
  </body></html>;
}
