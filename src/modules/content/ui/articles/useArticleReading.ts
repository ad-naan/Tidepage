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
  let layoutDirty = true;
  let articleTop = 0;
  let articleHeight = 0;
  let sectionTops: number[] = [];
  let safeGap = 0;
  const invalidate = () => {
    layoutDirty = true;
    schedule?.();
  };
  const observer = new ResizeObserver(invalidate);
  const header = document.querySelector(".header-slot");
  if (header) observer.observe(header);
  function measure() {
    frame = 0;
    const article = document.querySelector(".prose");
    if (article !== content) {
      if (content) observer.unobserve(content);
      if (article) observer.observe(article);
      content = article;
      layoutDirty = true;
    }
    const scroll = window.scrollY;
    if (layoutDirty && article) {
      const rect = article.getBoundingClientRect();
      articleTop = rect.top + scroll;
      articleHeight = rect.height;
      safeGap =
        Number.parseFloat(
          getComputedStyle(article).getPropertyValue("--reading-safe-gap"),
        ) || 0;
      sectionTops = [
        ...article.querySelectorAll('section[id^="section-"]'),
      ].map((section) => section.getBoundingClientRect().top + scroll);
      layoutDirty = false;
    }
    const next = article
      ? readingPosition({
          top: articleTop - scroll,
          height: articleHeight,
          viewportHeight: window.innerHeight,
          safeTop: (header?.getBoundingClientRect().bottom ?? 80) + safeGap,
          sections: sectionTops.map((top) => top - scroll),
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
  window.addEventListener("resize", invalidate);
  // Images, disclosures and lazy code may change chapter positions independently
  // of scrolling. Re-measure only on layout/content changes.
  document.addEventListener("load", invalidate, true);
  document.addEventListener("toggle", invalidate, true);
  window.addEventListener("hashchange", schedule);
  schedule();
  stop = () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener("scroll", schedule!);
    window.removeEventListener("resize", invalidate);
    document.removeEventListener("load", invalidate, true);
    document.removeEventListener("toggle", invalidate, true);
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
export function useArticleReadingValue<K extends keyof typeof current>(key: K) {
  return useSyncExternalStore(
    subscribe,
    () => current[key],
    () => initialReadingPosition[key],
  );
}
