import type { Locale } from "@/shared/i18n/config";
import type zh from "@/shared/i18n/messages/zh-CN.json";
export const catalogs: Record<Locale, () => Promise<{ default: typeof zh }>> = {
  "zh-CN": () => import("@/shared/i18n/messages/zh-CN.json"),
  en: () => import("@/shared/i18n/messages/en.json"),
};
