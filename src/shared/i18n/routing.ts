import { defineRouting } from "next-intl/routing";
import { locales, defaultLocale } from "./config";
export const routing = defineRouting({ locales, defaultLocale, localePrefix: "always", alternateLinks: false, localeCookie: { name: "tidepage_locale", sameSite: "lax", maxAge: 31536000 } });
