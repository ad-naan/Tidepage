"use client";
import {
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { IconButton } from "@/shared/ui/button/Button";
import { PencilFrame } from "@/shared/ui/drawing/CoastalMarks";
import styles from "./Dialog.module.css";

function isBackdrop(event: MouseEvent<HTMLDialogElement>) {
  if (event.target !== event.currentTarget) return false;
  const { left, right, top, bottom } =
    event.currentTarget.getBoundingClientRect();
  const { clientX, clientY } = event;
  return (
    clientX < left || clientX >= right || clientY < top || clientY >= bottom
  );
}

export function Dialog({
  children,
  footer,
  title,
  onClose,
  wide = false,
  layout = "default",
  size = "default",
  placement = "center",
  backdrop = "dim",
  surface = "paper",
  headingIcon,
  descriptionId,
  dismissible = true,
}: {
  children: ReactNode;
  footer?: ReactNode;
  title: string;
  onClose: () => void;
  wide?: boolean;
  layout?: "default" | "split" | "folio" | "workspace";
  size?: "default" | "compact";
  placement?: "center" | "bottom";
  backdrop?: "dim" | "clear";
  surface?: "paper" | "viewer" | "confirmation";
  headingIcon?: ReactNode;
  descriptionId?: string;
  dismissible?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const backdropPress = useRef<{ x: number; y: number } | null>(null);
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const reduced = useReducedMotion();
  function requestClose() {
    if (!dismissible || timer.current) return;
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
    dialog.querySelector<HTMLElement>("[data-dialog-initial-focus]")?.focus();
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
      data-placement={placement}
      data-backdrop={backdrop}
      data-surface={surface}
      className={`${styles.dialog} ${wide ? styles.wide : ""} ${layout === "split" ? styles.split : ""} ${layout === "folio" ? styles.folio : ""} ${layout === "workspace" ? styles.workspace : ""} ${size === "compact" ? styles.compact : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onPointerDownCapture={(event) => {
        backdropPress.current =
          event.isPrimary && event.button === 0 && isBackdrop(event)
            ? { x: event.clientX, y: event.clientY }
            : null;
      }}
      onPointerCancelCapture={() => {
        backdropPress.current = null;
      }}
      onClick={(event) => {
        const press = backdropPress.current;
        backdropPress.current = null;
        // A drag from a child can dispatch its click on the dialog itself.
        if (
          press &&
          event.detail > 0 &&
          isBackdrop(event) &&
          Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 8
        )
          requestClose();
      }}
      aria-label={title}
      aria-describedby={descriptionId}
      role={surface === "confirmation" ? "alertdialog" : undefined}
    >
      <div className={styles.inner}>
        {(surface !== "viewer" || layout === "folio") && (
          <PencilFrame
            kind={surface === "confirmation" ? "note" : "paper"}
            className={`${styles.paper} ${surface === "viewer" ? styles.folioPaper : ""}`}
          />
        )}
        <div className={styles.heading}>
          {headingIcon}
          <span className={styles.title}>{title}</span>
          {surface !== "confirmation" && (
            <IconButton
              className="icon-button"
              aria-label={t("close")}
              onClick={requestClose}
              disabled={closing || !dismissible}
            >
              <X size={19} />
            </IconButton>
          )}
        </div>
        <div
          className={styles.content}
          data-custom-scroll={surface === "viewer" ? undefined : t("region")}
          inert={closing}
        >
          {children}
        </div>
        {footer && (
          <div className={styles.footer} inert={closing}>
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
