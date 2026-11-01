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
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
  wide?: boolean;
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
      data-custom-scroll={t("region")}
      className={`${styles.dialog} ${wide ? styles.wide : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
    >
      <motion.div
        className={styles.inner}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
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
        {children}
      </motion.div>
    </dialog>
  );
}
