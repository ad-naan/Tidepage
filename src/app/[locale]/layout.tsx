import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { catalogs } from "@/i18n/catalogs";
import { NoticeProvider } from "@/shared/ui/feedback/NoticeProvider";
import { DocumentLanguage } from "@/shared/i18n/DocumentLanguage";
import { JsonLd } from "@/server/seo/JsonLd";
import { siteGraph } from "@/server/seo/structured-data";
import { isLocale } from "@/shared/i18n/config";
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
  return (
    <NextIntlClientProvider
      key={locale}
      locale={locale}
      messages={messages}
      timeZone="Asia/Shanghai"
    >
      <DocumentLanguage locale={locale} />
      <JsonLd
        data={siteGraph(locale, {
          name: messages.site.name,
          description: messages.site.description,
        })}
      />
      <NoticeProvider>{children}</NoticeProvider>
    </NextIntlClientProvider>
  );
}
