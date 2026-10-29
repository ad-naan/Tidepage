"use client";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "../i18n/navigation";
import { isLocale, locales, localeRegistry } from "../i18n/config";
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  return <select value={locale} className="language-switch" aria-label={t("label")} onChange={event => {
    const next = event.target.value;
    if (!isLocale(next)) return;
    const suffix = new URLSearchParams(search);
    router.replace(`${pathname}${suffix.size ? `?${suffix}` : ""}`, { locale: next });
  }}>{locales.map(code => <option key={code} value={code} lang={code}>{localeRegistry[code].name}</option>)}</select>;
}
