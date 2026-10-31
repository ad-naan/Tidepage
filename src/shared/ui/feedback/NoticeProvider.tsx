"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Info, X, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import styles from "./notice.module.css";

export type NoticeInput = {
  title: string;
  detail?: string;
  tone?: "info" | "success" | "error";
  duration?: number;
};
type Notice = NoticeInput & { id: number; tone: "info" | "success" | "error" };
type PageNotice = { key: string; title: string; eyebrow?: string };
type NoticeContext = {
  current: Notice | null;
  page: PageNotice | null;
  notify: (input: NoticeInput) => number;
  dismiss: (id?: number) => void;
  pause: (paused: boolean) => void;
  registerDock: () => () => void;
  setPage: (value: PageNotice) => void;
  clearPage: (key: string) => void;
};
const Context = createContext<NoticeContext | null>(null);
function useFeedback() {
  const value = useContext(Context);
  if (!value) throw new Error("NoticeProvider must wrap feedback consumers");
  return value;
}
export function useNotice() {
  const { notify, dismiss } = useFeedback();
  return { notify, dismiss };
}
/** Page information occupies the same rail as transient feedback; newer pages own cleanup. */
export function usePageNotice({ key, title, eyebrow }: PageNotice) {
  const { setPage, clearPage } = useFeedback();
  useEffect(() => {
    setPage({ key, title, eyebrow });
    return () => clearPage(key);
  }, [key, title, eyebrow, setPage, clearPage]);
}

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Notice | null>(null);
  const [page, setPage] = useState<PageNotice | null>(null);
  const [paused, pause] = useState(false);
  const [docks, setDocks] = useState(0);
  const [mounted, setMounted] = useState(false);
  const sequence = useRef(0);
  const notify = useCallback((input: NoticeInput) => {
    const id = ++sequence.current;
    pause(false);
    setCurrent({ ...input, id, tone: input.tone ?? "info" });
    return id;
  }, []);
  const dismiss = useCallback((id?: number) => {
    setCurrent((value) =>
      !value || (id !== undefined && value.id !== id) ? value : null,
    );
  }, []);
  const registerDock = useCallback(() => {
    setDocks((value) => value + 1);
    return () => setDocks((value) => Math.max(0, value - 1));
  }, []);
  const clearPage = useCallback(
    (key: string) => setPage((value) => (value?.key === key ? null : value)),
    [],
  );
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!current || paused || current.duration === 0) return;
    const timer = setTimeout(
      () => dismiss(current.id),
      Math.max(2400, current.duration ?? 4200),
    );
    return () => clearTimeout(timer);
  }, [current, paused, dismiss]);
  useEffect(() => {
    const visibility = () => pause(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  const value = useMemo(
    () => ({
      current,
      page,
      notify,
      dismiss,
      pause,
      registerDock,
      setPage,
      clearPage,
    }),
    [current, page, notify, dismiss, registerDock, clearPage],
  );
  return (
    <Context.Provider value={value}>
      {children}
      <div
        className={styles.srOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {current?.tone !== "error" &&
          current &&
          `${current.title} ${current.detail ?? ""}`}
      </div>
      <div className={styles.srOnly} role="alert" aria-atomic="true">
        {current?.tone === "error" &&
          `${current.title} ${current.detail ?? ""}`}
      </div>
      {mounted &&
        docks === 0 &&
        current &&
        createPortal(
          <div className={styles.fallback}>
            <NoticeCard notice={current} />
          </div>,
          document.body,
        )}
    </Context.Provider>
  );
}

export function Annotation({
  children,
  tone = "info",
  className = "",
}: {
  children: ReactNode;
  tone?: Notice["tone"];
  className?: string;
}) {
  return (
    <div className={`${styles.annotation} ${className}`} data-tone={tone}>
      <svg
        className={styles.wash}
        viewBox="0 0 300 60"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className={styles.paperWash}
          d="M9 10q24-8 49-4t53-1 57 1 61-1 58 4l5 10-3 15 3 13q-27 7-55 3t-58 2-61-1-61 1-47-4l-5-15Z"
        />
        <path
          className={styles.warmWash}
          d="M8 36q60-10 121-3t160 1l-3 14q-91 9-151 2T7 49Z"
        />
      </svg>
      <svg
        className={styles.bracket}
        viewBox="0 0 18 44"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M13 2 7 3C4 13 9 24 5 39l7 2M9 4q-3 16-2 31"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          filter="url(#tidepage-pencil)"
        />
      </svg>
      {children}
    </div>
  );
}
const icons = { info: Info, success: Check, error: AlertCircle };
function NoticeCard({ notice }: { notice: Notice }) {
  const { dismiss, pause } = useFeedback();
  const t = useTranslations("feedback");
  const Icon = icons[notice.tone];
  return (
    <div
      className={styles.notice}
      onPointerEnter={() => pause(true)}
      onPointerLeave={() => pause(false)}
      onFocusCapture={() => pause(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) pause(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          dismiss(notice.id);
        }
      }}
    >
      <Annotation tone={notice.tone}>
        <Icon
          className={styles.icon}
          size={14}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <div className={styles.words}>
          <span className={styles.eyebrow}>{t(`tones.${notice.tone}`)}</span>
          <strong>{notice.title}</strong>
          {notice.detail && (
            <span className={styles.detail}>{notice.detail}</span>
          )}
        </div>
        <button
          className={styles.dismiss}
          aria-label={t("dismiss")}
          onClick={() => dismiss(notice.id)}
        >
          <X size={12} />
        </button>
      </Annotation>
    </div>
  );
}
/** Header location, beside the identity. Without a header the provider renders a safe fallback. */
export function NoticeDock({ context }: { context?: ReactNode }) {
  const { current, page, registerDock } = useFeedback();
  const reduce = useReducedMotion();
  useEffect(registerDock, [registerDock]);
  if (!current && !page && !context) return null;
  return (
    <div className={styles.dock} data-transient={!!current}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current?.id ?? "context"}
          initial={{ opacity: 0, y: reduce ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduce ? 0 : -3 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
        >
          {current && <NoticeCard notice={current} />}
          {!current && context && (
            <Annotation className={styles.context}>{context}</Annotation>
          )}
          {!current && !context && page && (
            <Annotation className={styles.context}>
              <div className={styles.words}>
                <span className={styles.eyebrow}>{page.eyebrow}</span>
                <strong>{page.title}</strong>
              </div>
            </Annotation>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
