import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { catalogs } from "@/i18n/catalogs";
import { NoticeProvider } from "@/shared/ui/feedback/NoticeProvider";
import { DocumentLanguage } from "@/shared/i18n/DocumentLanguage";
import { JsonLd } from "@/server/seo/JsonLd";
import { siteGraph } from "@/server/seo/structured-data";
import { isLocale } from "@/shared/i18n/config";
import { getPublicSiteIdentity } from "@/modules/site-settings/server";
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const messages = (await catalogs[locale]()).default;
  const identity = await getPublicSiteIdentity(locale);
  return (
    <NextIntlClientProvider
      key={locale}
      locale={locale}
      messages={messages}
      timeZone="Asia/Shanghai"
    >
      <DocumentLanguage locale={locale} />
      <JsonLd data={siteGraph(locale, identity)} />
      <NoticeProvider>{children}</NoticeProvider>
    </NextIntlClientProvider>
  );
}
