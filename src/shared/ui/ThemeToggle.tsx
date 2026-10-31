"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import styles from "./ThemeToggle.module.css";

const modes = {
  light: { label: "dark", icon: Moon },
  dark: { label: "light", icon: Sun },
} as const;

export function ThemeToggle({
  theme,
  onChange,
}: {
  theme: keyof typeof modes;
  onChange: () => void;
}) {
  const t = useTranslations("header");
  const mode = modes[theme];
  const Icon = mode.icon;
  return (
    <button
      className={styles.toggle}
      data-theme-toggle
      onClick={onChange}
      aria-label={t(mode.label)}
    >
      <Icon size={15} aria-hidden="true" />
      <span>{t(mode.label)}</span>
    </button>
  );
}
