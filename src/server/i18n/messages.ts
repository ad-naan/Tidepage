import "server-only";
import { catalogs } from "@/i18n/catalogs";
import { defaultLocale, isLocale, type Locale } from "@/shared/i18n/config";

export async function getCatalog(locale: Locale) {
  return (await catalogs[locale]()).default;
}

export function requestLocale(request: Request): Locale {
  const url = new URL(request.url);
  const requested = url.searchParams.get("locale") ?? url.pathname.split("/")[1];
  return isLocale(requested) ? requested : defaultLocale;
}
