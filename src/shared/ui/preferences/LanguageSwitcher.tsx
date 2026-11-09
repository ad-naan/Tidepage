"use client";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/shared/i18n/navigation";
import { isLocale, locales, localeRegistry } from "@/shared/i18n/config";
import { localeSwitchHref } from "@/shared/i18n/location";
import { Select } from "@/shared/ui/select/Select";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";

const options = locales.map((code) => ({
  value: code,
  label: localeRegistry[code].name,
  lang: code,
}));

export function LanguageSwitcher({
  variant = "select",
}: { variant?: "select" | "inline" } = {}) {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [pending, startTransition] = useTransition();
  function changeLocale(next: string) {
    if (!isLocale(next) || next === locale) return;
    const href = localeSwitchHref(pathname, search, window.location.hash);
    startTransition(() =>
      router.replace(href, { locale: next, scroll: false }),
    );
  }
  if (variant === "inline")
    return (
      <FilterTabs
        variant="inline"
        value={locale}
        label={t("label")}
        busy={pending}
        options={options}
        onChange={changeLocale}
      />
    );
  return (
    <Select
      value={locale}
      label={t("label")}
      variant="ghost"
      className="language-switch"
      busy={pending}
      dir={localeRegistry[locale].direction}
      icon={<Languages size={16} />}
      options={options}
      onValueChange={changeLocale}
    />
  );
}
