import type { Metadata } from "next";
import { getEnv } from "@/server/config/env";
import { site } from "@/shared/config/site";
import { JsonLd } from "@/server/seo/JsonLd";
import { siteGraph } from "@/server/seo/structured-data";
import localFont from "next/font/local";
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
export const metadata: Metadata = {
  metadataBase: new URL(getEnv().SITE_URL),
  title: { default: site.name, template: "%s ? adnaan" },
  description: site.description,
  robots: {
    index: getEnv().INDEXING_ENABLED,
    follow: getEnv().INDEXING_ENABLED,
  },
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
};
const gardenHand = localFont({
  src: "../../public/fonts/garden-hand.woff2",
  variable: "--font-hand",
  weight: "300",
  display: "swap",
});
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-CN"
      className={gardenHand.variable}
      data-scroll-behavior="smooth"
    >
      <body>
        <a href="#main-content" className="skip-link">
          跳到主要内容
        </a>
        <JsonLd data={siteGraph()} />
        {children}
      </body>
    </html>
  );
}
