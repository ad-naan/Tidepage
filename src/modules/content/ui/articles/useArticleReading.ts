"use client";
import { useSyncExternalStore } from "react";
import {
  initialReadingPosition,
  readingPosition,
} from "@/shared/lib/reading-position";

// The header and contents share one measurement and observer for the current article.
let current = initialReadingPosition;
const listeners = new Set<() => void>();
let schedule: (() => void) | undefined;
let stop: (() => void) | undefined;
function start() {
  let frame = 0;
  let content: Element | null = null;
  const observer = new ResizeObserver(() => schedule?.());
  const header = document.querySelector(".header-slot");
  if (header) observer.observe(header);
  function measure() {
    frame = 0;
    const article = document.querySelector(".prose");
    if (article !== content) {
      if (content) observer.unobserve(content);
      if (article) observer.observe(article);
      content = article;
    }
    const rect = article?.getBoundingClientRect();
    const safeGap = article
      ? Number.parseFloat(
          getComputedStyle(article).getPropertyValue("--reading-safe-gap"),
        ) || 0
      : 0;
    const next = rect
      ? readingPosition({
          top: rect.top,
          height: rect.height,
          viewportHeight: window.innerHeight,
          safeTop: (header?.getBoundingClientRect().bottom ?? 80) + safeGap,
          sections: [
            ...article!.querySelectorAll('section[id^="section-"]'),
          ].map((section) => section.getBoundingClientRect().top),
        })
      : initialReadingPosition;
    if (
      next.active !== current.active ||
      next.percent !== current.percent ||
      next.started !== current.started
    ) {
      current = next;
      listeners.forEach((listener) => listener());
    }
  }
  schedule = () => {
    if (!frame) frame = requestAnimationFrame(measure);
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("hashchange", schedule);
  schedule();
  stop = () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener("scroll", schedule!);
    window.removeEventListener("resize", schedule!);
    window.removeEventListener("hashchange", schedule!);
    schedule = undefined;
    current = initialReadingPosition;
  };
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) start();
  else schedule?.();
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      stop?.();
      stop = undefined;
    }
  };
}
export function useArticleReading() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => initialReadingPosition,
  );
}
