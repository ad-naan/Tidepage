"use client";

import { useSyncExternalStore } from "react";

export type BackgroundMotion = "flowing" | "still";
const storageKey = "tidepage-background-motion";
const listeners = new Set<() => void>();
let preference: BackgroundMotion | undefined;

function readPreference(): BackgroundMotion {
  if (preference) return preference;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === "flowing" || saved === "still") return saved;
  } catch {
    // The current visit can still keep a choice when storage is unavailable.
  }
  return "flowing";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const changed = (event: StorageEvent) => {
    if (event.key !== storageKey && event.key !== null) return;
    preference = undefined;
    listener();
  };
  window.addEventListener("storage", changed);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", changed);
  };
}

function setPreference(value: BackgroundMotion) {
  preference = value;
  try {
    localStorage.setItem(storageKey, value);
  } catch {
    // Retain the in-memory preference.
  }
  listeners.forEach((listener) => listener());
}

export function useBackgroundMotion() {
  const selected = useSyncExternalStore(
    subscribe,
    readPreference,
    () => "flowing" as const,
  );
  return { selected, setPreference };
}
