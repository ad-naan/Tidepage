import { createShareImage } from "@/modules/site-settings/server/share-image";
import { defaultLocale } from "@/shared/i18n/config";
import zhCN from "@/shared/i18n/messages/zh-CN.json";

export const alt = zhCN.site.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return createShareImage({ locale: defaultLocale });
}
