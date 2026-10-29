import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale } from "@/shared/i18n/config";
import { catalogs } from "./catalogs";
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : defaultLocale;
  return { locale, messages: (await catalogs[locale]()).default, timeZone: "Asia/Shanghai" };
});
