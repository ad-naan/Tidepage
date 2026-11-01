"use client";

import { LanguageSwitcher } from "@/shared/ui/preferences/LanguageSwitcher";
import { ThemeToggle } from "@/shared/ui/preferences/ThemeToggle";

export function FooterPreferences({
  theme,
  onThemeChange,
}: {
  theme: "light" | "dark";
  onThemeChange: () => void;
}) {
  return (
    <div className="footer-preferences">
      <LanguageSwitcher />
      <span aria-hidden="true">·</span>
      <ThemeToggle theme={theme} onChange={onThemeChange} />
    </div>
  );
}
