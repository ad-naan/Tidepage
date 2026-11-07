import type { Locale } from "@/shared/i18n/config";

export const site = {
  timeZone: "Asia/Shanghai",
} as const;
export const shareImagePath = "/opengraph-image";

export function feedPath(locale: Locale) {
  return `/feed.xml?locale=${locale}`;
}
export const navigationItems = [
  { href: "/", key: "home" },
  { href: "/articles", key: "articles" },
  { href: "/notes", key: "notes" },
  { href: "/projects", key: "projects" },
  { href: "/quotes", key: "quotes" },
  { href: "/gallery", key: "gallery" },
  { href: "/about", key: "about" },
  { href: "/site", key: "site" },
  { href: "/friends", key: "friends" },
] as const;
