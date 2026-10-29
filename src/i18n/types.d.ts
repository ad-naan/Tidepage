import type { Locale as SupportedLocale } from "@/shared/i18n/config";
import type messages from "@/shared/i18n/messages/zh-CN.json";
declare module "next-intl" {
  interface AppConfig { Locale: SupportedLocale; Messages: typeof messages; }
}
