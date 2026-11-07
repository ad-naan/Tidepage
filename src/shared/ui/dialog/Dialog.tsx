"use client";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { IconButton } from "@/shared/ui/button/Button";
import { PencilFrame } from "@/shared/ui/drawing/CoastalMarks";
import styles from "./Dialog.module.css";
export function Dialog({
  children,
  title,
  onClose,
  wide = false,
  layout = "default",
  size = "default",
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
  wide?: boolean;
  layout?: "default" | "split";
  size?: "default" | "compact";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const reduced = useReducedMotion();
  function requestClose() {
    if (timer.current) return;
    if (reduced) {
      close.current();
      return;
    }
    setClosing(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setClosing(false);
      close.current();
    }, 160);
  }
  const t = useTranslations("ui.dialog");
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement;
    dialog.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      if (timer.current) clearTimeout(timer.current);
      dialog.close();
      document.body.style.overflow = before;
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      data-closing={closing}
      className={`${styles.dialog} ${wide ? styles.wide : ""} ${layout === "split" ? styles.split : ""} ${size === "compact" ? styles.compact : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
      aria-label={title}
    >
      <div className={styles.inner}>
        <PencilFrame className={styles.paper} />
        <div className={styles.heading}>
          <span>{title}</span>
          <IconButton
            className="icon-button"
            aria-label={t("close")}
            onClick={requestClose}
            disabled={closing}
          >
            <X size={19} />
          </IconButton>
        </div>
        <div
          className={styles.content}
          data-custom-scroll={t("region")}
          inert={closing}
        >
          {children}
        </div>
      </div>
    </dialog>
  );
}
