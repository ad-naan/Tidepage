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
import { useTranslations } from "next-intl";
import { defaultLocale, isLocale, type Locale } from "@/shared/i18n/config";
import { isQuietNavigationPath } from "@/shared/config/navigation";
import styles from "./navigation.module.css";

const Context = createContext<(() => () => void) | null>(null);

export function useNavigationPending(pending: boolean) {
  const hold = useContext(Context);
  useEffect(() => {
    if (pending) return hold?.();
  }, [hold, pending]);
}

function RouteCommit({ commit }: { commit: (route: string) => void }) {
  const path = usePathname();
  const search = useSearchParams();
  useEffect(() => commit(`${path}?${search}`), [path, search, commit]);
  return null;
}

let previousLine = -1;

/** Replaces only the public route's content while its shared layout stays mounted. */
export function RouteLoading() {
  const t = useTranslations("navigationLoading");
  const lines = t.raw("lines") as string[];
  const length = lines.length;
  const [line, setLine] = useState(0);
  useEffect(() => {
    let next = Math.floor(Math.random() * length);
    if (length > 1 && next === previousLine) next = (next + 1) % length;
    previousLine = next;
    setLine(next);
  }, [length]);
  return (
    <div
      className={styles.route}
      data-route-loading
      role="status"
      aria-label={t("label")}
    >
      <div className={styles.sketch} aria-hidden="true">
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
        <p>{lines[line]}</p>
      </div>
    </div>
  );
}

/** Shows a delayed progress line above the persistent route layouts. */
export function NavigationFeedback({
  children,
  labels,
}: {
  children: ReactNode;
  labels: Record<Locale, string>;
}) {
  const path = usePathname();
  const segment = path.split("/")[1];
  const locale = isLocale(segment) ? segment : defaultLocale;
  const [visible, setVisible] = useState(false);
  const reveal = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const holds = useRef(0);
  const committed = useRef("");
  const historyPending = useRef(false);

  const show = useCallback(() => {
    reveal.current ??= setTimeout(() => setVisible(true), 160);
  }, []);

  const settle = useCallback(() => {
    if (holds.current || historyPending.current) return;
    clearTimeout(reveal.current);
    reveal.current = undefined;
    setVisible(false);
  }, []);

  const hold = useCallback(() => {
    holds.current++;
    show();
    return () => {
      holds.current--;
      settle();
    };
  }, [show, settle]);

  const commit = useCallback(
    (route: string) => {
      committed.current = route;
      historyPending.current = false;
      settle();
    },
    [settle],
  );

  useEffect(() => {
    function backOrForward() {
      const current = `${location.pathname}?${new URLSearchParams(location.search)}`;
      historyPending.current = current !== committed.current;
      if (historyPending.current) show();
      else settle();
    }
    window.addEventListener("popstate", backOrForward);
    return () => {
      window.removeEventListener("popstate", backOrForward);
      clearTimeout(reveal.current);
      reveal.current = undefined;
    };
  }, [show, settle]);

  return (
    <Context.Provider value={hold}>
      {children}
      <Suspense fallback={null}>
        <RouteCommit commit={commit} />
      </Suspense>
      {isQuietNavigationPath(path) && (
        <div className={styles.progress} role="status">
          {visible && (
            <>
              <span className={styles.track} aria-hidden="true" />
              <span className={styles.label}>{labels[locale]}</span>
            </>
          )}
        </div>
      )}
    </Context.Provider>
  );
}
