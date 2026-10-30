"use client";
import { useEffect } from "react";
import { localeRegistry, type Locale } from "./config";

/** The root HTML element persists when the locale route segment changes. */
export function DocumentLanguage({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeRegistry[locale].direction;
  }, [locale]);
  return null;
}
