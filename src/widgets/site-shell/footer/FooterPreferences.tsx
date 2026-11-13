"use client";

import { useTranslations } from "next-intl";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import { LanguageSwitcher } from "@/shared/ui/preferences/LanguageSwitcher";
import {
  themePreferences,
  type ThemePreference,
} from "@/shared/ui/preferences/useThemePreference";
import styles from "./SiteFooter.module.css";
import type { BackgroundMotion } from "@/shared/ui/preferences/useBackgroundMotion";

export function FooterPreferences({
  theme,
  onThemeChange,
  backgroundMotion,
  onBackgroundMotionChange,
}: {
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  backgroundMotion: BackgroundMotion;
  onBackgroundMotionChange: (motion: BackgroundMotion) => void;
}) {
  const t = useTranslations("footer.preferences");
  const language = useTranslations("language");
  return (
    <div className={styles.preferences} role="group" aria-label={t("title")}>
      <span aria-hidden="true">{t("theme")}</span>
      <FilterTabs
        variant="inline"
        value={theme}
        label={t("theme")}
        options={themePreferences.map((value) => ({ value, label: t(value) }))}
        onChange={onThemeChange}
      />
      <span aria-hidden="true">{language("label")}</span>
      <LanguageSwitcher variant="inline" />
      <span aria-hidden="true">{t("background")}</span>
      <FilterTabs
        variant="inline"
        value={backgroundMotion}
        label={t("background")}
        options={(["flowing", "still"] as const).map((value) => ({
          value,
          label: t(value),
        }))}
        onChange={onBackgroundMotionChange}
      />
    </div>
  );
}
