"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

export const themePreferences = ["light", "system", "dark"] as const;
export type ThemePreference = (typeof themePreferences)[number];

const storageKey = "adnaan-theme";
const colorScheme = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();
let preference: ThemePreference | undefined;
let activeTransition: ViewTransition | undefined;

function readPreference(): ThemePreference {
  if (preference) return preference;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (saved === "light" || saved === "dark" || saved === "system")
      return saved;
  } catch {
    // Storage can be unavailable in private contexts.
  }
  return "system";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  function onStorage(event: StorageEvent) {
    if (event.key !== storageKey && event.key !== null) return;
    preference = undefined;
    listener();
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function subscribeSystem(listener: () => void) {
  const media = matchMedia(colorScheme);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function resolveTheme(value: ThemePreference) {
  if (value !== "system") return value;
  return matchMedia(colorScheme).matches ? "dark" : "light";
}

function getTheme() {
  return resolveTheme(readPreference());
}

function setPreference(next: ThemePreference) {
  if (readPreference() === next) return;
  const root = document.documentElement;
  const theme = resolveTheme(next);
  const animate =
    root.dataset.theme !== theme &&
    typeof document.startViewTransition === "function" &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches;

  activeTransition?.skipTransition();
  activeTransition = undefined;
  delete root.dataset.themeTransition;
  preference = next;
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Keep the in-memory choice for this visit.
  }

  function apply() {
    root.dataset.theme = getTheme();
    listeners.forEach((listener) => listener());
  }

  if (!animate) {
    apply();
    return;
  }

  const transition = document.startViewTransition(() => {
    if (activeTransition !== transition) return;
    root.dataset.themeTransition = getTheme();
    flushSync(apply);
  });
  activeTransition = transition;
  // A skipped capture rejects ready even though its update can still run.
  void transition.ready.catch(() => {});
  function clear() {
    if (activeTransition !== transition) return;
    activeTransition = undefined;
    delete root.dataset.themeTransition;
  }
  void transition.finished.then(clear, clear);
}

export function useThemePreference() {
  const selected = useSyncExternalStore<ThemePreference>(
    subscribe,
    readPreference,
    () => "system",
  );
  const theme = useSyncExternalStore<Exclude<ThemePreference, "system">>(
    subscribeSystem,
    getTheme,
    () => "light",
  );
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = getTheme();
  }, [theme]);
  return { selected, theme, setPreference };
}
