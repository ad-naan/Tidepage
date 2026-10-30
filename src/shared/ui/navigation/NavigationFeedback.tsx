"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/shared/i18n/config";
import styles from "./navigation.module.css";

type Copy = { label: string; lines: string[] };
type Feedback = {
  begin: () => void;
  settle: () => void;
  hold: () => () => void;
};
const Context = createContext<Feedback | null>(null);

export function useNavigationFeedback() {
  return useContext(Context);
}

function RouteCommit({ settle }: { settle: () => void }) {
  const path = usePathname();
  const search = useSearchParams();
  useEffect(settle, [path, search, settle]);
  return null;
}

/** Persists above locale layouts, so a language change cannot reset the exit animation. */
export function NavigationFeedback({
  children,
  copy,
}: {
  children: ReactNode;
  copy: Record<Locale, Copy>;
}) {
  const path = usePathname();
  const segment = path.split("/")[1];
  const locale = isLocale(segment) ? segment : defaultLocale;
  const words = copy[locale];
  const [visible, setVisible] = useState(false);
  const [line, setLine] = useState(0);
  const active = useRef(false);
  const started = useRef(0);
  const holds = useRef(0);
  const exit = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const previous = useRef(-1);
  const count = useRef(words.lines.length);
  count.current = words.lines.length;

  const begin = useCallback(() => {
    clearTimeout(exit.current);
    if (active.current) return;
    active.current = true;
    started.current = performance.now();
    const length = count.current;
    let next = Math.floor(Math.random() * length);
    if (length > 1 && next === previous.current) next = (next + 1) % length;
    previous.current = next;
    setLine(next);
    const main = document.getElementById("main-content");
    if (main)
      document.documentElement.style.setProperty(
        "--route-content-height",
        `${main.getBoundingClientRect().height}px`,
      );
    document.documentElement.dataset.navigating = "true";
    setVisible(true);
  }, []);

  const settle = useCallback(() => {
    clearTimeout(exit.current);
    if (!active.current || holds.current > 0) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const minimum = reduced ? 0 : 650;
    exit.current = setTimeout(
      () => {
        if (holds.current > 0) return;
        active.current = false;
        setVisible(false);
        delete document.documentElement.dataset.navigating;
        document.documentElement.style.removeProperty("--route-content-height");
      },
      Math.max(0, minimum - (performance.now() - started.current)),
    );
  }, []);

  const hold = useCallback(() => {
    holds.current++;
    begin();
    return () => {
      holds.current = Math.max(0, holds.current - 1);
      settle();
    };
  }, [begin, settle]);

  useEffect(() => {
    function back() {
      begin();
    }
    window.addEventListener("popstate", back);
    return () => {
      window.removeEventListener("popstate", back);
      clearTimeout(exit.current);
      delete document.documentElement.dataset.navigating;
      document.documentElement.style.removeProperty("--route-content-height");
    };
  }, [begin]);

  return (
    <Context.Provider value={{ begin, settle, hold }}>
      {children}
      <Suspense fallback={null}>
        <RouteCommit settle={settle} />
      </Suspense>
      <div
        className={styles.veil}
        data-visible={visible}
        aria-hidden={!visible}
      >
        <div
          className={styles.composition}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <svg viewBox="0 0 200 90" fill="none" aria-hidden="true">
            <defs>
              <radialGradient id="navigation-glow">
                <stop stopColor="currentColor" stopOpacity=".18" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle
              className={styles.glow}
              cx="100"
              cy="43"
              r="39"
              fill="url(#navigation-glow)"
            />
            <path className={styles.sun} d="M84 47a16 16 0 0 1 32 0" />
            <path
              className={styles.horizon}
              d="M29 49c24-2 46 1 71 0s49-2 71 0"
            />
            <path className={styles.water} d="M80 59h40M88 66h24M95 73h10" />
            <circle
              className={styles.spark}
              cx="100"
              cy="28"
              r="1.4"
              fill="currentColor"
            />
          </svg>
          <span className={styles.label}>{words.label}</span>
          <p>{words.lines[line % words.lines.length]}</p>
        </div>
      </div>
    </Context.Provider>
  );
}

/** Reserve the content slot while Next streams any route, including immersive routes. */
export function RouteLoading() {
  const feedback = useNavigationFeedback();
  const hold = feedback?.hold;
  useEffect(() => hold?.(), [hold]);
  return <div className={styles.placeholder} aria-hidden="true" />;
}
