import { Anchor } from "@/shared/ui/link/Anchor";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { getEnv } from "@/server/config/env";
import { feedPath } from "@/shared/config/site";
import { getPublicSiteIdentity } from "@/modules/site-settings/server";
import { localeRegistry } from "@/shared/i18n/config";
import { locales, type Locale } from "@/shared/i18n/config";
import { catalogs } from "@/i18n/catalogs";
import { NavigationFeedback } from "@/shared/ui/navigation/NavigationFeedback";
import { themeBootstrap } from "@/shared/config/theme";
import { PencilDefinitions } from "@/shared/ui/drawing/PencilDefinitions";
import "@/styles/globals.css";
import "@/styles/refinements.css";
import "@/styles/chrome.css";
import "@/styles/header.css";
import "@/styles/theme.css";
import "@/styles/scrollbars.css";
import "@/styles/celestial.css";
import "@/styles/night.css";
import "@/styles/playground.css";
import "@/styles/atmosphere.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-sc";
import "@fontsource-variable/noto-serif-sc";
import "@/styles/layout.css";
import "@/styles/sky-header.css";
import "@/styles/tokens.css";
import "@/styles/design-contract.css";
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const identity = await getPublicSiteIdentity(locale);
  return {
    metadataBase: new URL(getEnv().SITE_URL),
    title: { default: identity.title, template: `%s · ${identity.name}` },
    description: identity.description,
    robots: {
      index: getEnv().INDEXING_ENABLED,
      follow: getEnv().INDEXING_ENABLED,
    },
    alternates: {
      types: { "application/rss+xml": feedPath(locale) },
    },
  };
}
const gardenHand = localFont({
  src: "../../public/assets/fonts/garden-hand.woff2",
  variable: "--font-hand",
  weight: "300",
  display: "swap",
});
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations("site");
  const loadingLabels = Object.fromEntries(
    await Promise.all(
      locales.map(async (language) => [
        language,
        (await catalogs[language]()).default.navigationLoading.label,
      ]),
    ),
  ) as Record<Locale, string>;
  return (
    <html
      lang={locale}
      dir={localeRegistry[locale].direction}
      className={gardenHand.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <style>{`
          :root {
            color-scheme: light dark;
            background-color: var(--paper, #faf9f5);
          }
          :root[data-theme="light"] { color-scheme: light; }
          :root[data-theme="dark"] {
            color-scheme: dark;
            background-color: var(--paper, #171c26);
          }
          @media (prefers-color-scheme: dark) {
            :root:not([data-theme]) { background-color: var(--paper, #171c26); }
          }
        `}</style>
      </head>
      <body>
        <PencilDefinitions />
        <Anchor href="#main-content" className="skip-link">
          {t("skip")}
        </Anchor>
        <NextIntlClientProvider
          locale={locale}
          messages={{
            error: messages.error,
            notFound: messages.notFound,
            header: {
              light: messages.header.light,
              dark: messages.header.dark,
            },
          }}
        >
          <NavigationFeedback labels={loadingLabels}>
            {children}
          </NavigationFeedback>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
