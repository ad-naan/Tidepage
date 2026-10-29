export const localeRegistry = {
  "zh-CN": { name: "简体中文", hreflang: "zh-CN", openGraph: "zh_CN", direction: "ltr" },
  en: { name: "English", hreflang: "en", openGraph: "en_US", direction: "ltr" },
} as const;
export type Locale = keyof typeof localeRegistry;
export const locales = Object.keys(localeRegistry) as [Locale, ...Locale[]];
export const defaultLocale: Locale = "zh-CN";
export function isLocale(value: unknown): value is Locale { return typeof value === "string" && locales.includes(value as Locale); }
export function localizedPath(locale: Locale, path: string) { return `/${locale}${path === "/" ? "" : path}`; }
