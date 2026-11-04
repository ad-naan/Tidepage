"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { spring } from "@/shared/lib/motion";
import { IconButton } from "@/shared/ui/button/Button";
import { PencilFrame } from "@/shared/ui/drawing/CoastalMarks";
import styles from "./Dialog.module.css";
export function Dialog({
  children,
  title,
  onClose,
  wide = false,
  layout = "default",
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
  wide?: boolean;
  layout?: "default" | "split";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useTranslations("ui.dialog");
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement;
    dialog?.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = before;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${wide ? styles.wide : ""} ${layout === "split" ? styles.split : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
    >
      <motion.div
        className={styles.inner}
        // Transforms here expand the scroll host during entry and can leave a
        // custom rail measured against that temporary overflow. Fade in place.
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={spring}
      >
        <PencilFrame className={styles.paper} />
        <div className={styles.heading}>
          <span>{title}</span>
          <IconButton
            className="icon-button"
            aria-label={t("close")}
            onClick={onClose}
          >
            <X size={19} />
          </IconButton>
        </div>
        <div className={styles.content} data-custom-scroll={t("region")}>
          {children}
        </div>
      </motion.div>
    </dialog>
  );
}
