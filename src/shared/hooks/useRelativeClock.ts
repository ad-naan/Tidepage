"use client";
import { useSyncExternalStore } from "react";

let now = Date.now();
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
function tick() {
  clearTimeout(timer);
  now = Date.now();
  for (const listener of listeners) listener();
  if (listeners.size && document.visibilityState !== "hidden")
    timer = setTimeout(tick, 60_000 - (now % 60_000));
}
function visibility() {
  if (document.visibilityState === "hidden") clearTimeout(timer);
  else tick();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", visibility);
    tick();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
    }
  };
}
const noSubscribe = () => () => {};
const snapshot = () => now;
const serverSnapshot = () => null;

/** All activity timestamps share one minute clock, paused in hidden tabs. */
export function useRelativeClock(enabled: boolean) {
  return useSyncExternalStore(
    enabled ? subscribe : noSubscribe,
    snapshot,
    serverSnapshot,
  );
}
