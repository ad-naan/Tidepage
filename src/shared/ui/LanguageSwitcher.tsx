"use client";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "../i18n/navigation";
import { isLocale, locales, localeRegistry } from "../i18n/config";
import { localeSwitchHref } from "../i18n/location";
import { Select } from "./Select";
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={locale}
      label={t("label")}
      variant="ghost"
      className="language-switch"
      busy={pending}
      dir={localeRegistry[locale].direction}
      icon={<Languages size={16} />}
      options={locales.map((code) => ({
        value: code,
        label: localeRegistry[code].name,
        lang: code,
      }))}
      onValueChange={(next) => {
        if (!isLocale(next) || next === locale) return;
        const href = localeSwitchHref(pathname, search, window.location.hash);
        startTransition(() =>
          router.replace(href, { locale: next, scroll: false }),
        );
      }}
    />
  );
}
