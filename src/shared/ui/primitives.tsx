"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { X, ArrowUpRight } from "lucide-react";
import { spring } from "@/shared/lib/motion";

export function SpringButton({
  children,
  onClick,
  className = "",
  label,
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      disabled={disabled}
      aria-label={label}
      className={className}
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.94 }}
      transition={spring}
    >
      {children}
    </motion.button>
  );
}
export function PageHeading({
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </header>
  );
}
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
      className={`dialog ${wide ? "dialog-wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
    >
      <motion.div
        className="dialog-inner"
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring}
      >
        <div className="dialog-top">
          <span>{title}</span>
          <SpringButton
            className="icon-button"
            label={t("close")}
            onClick={onClose}
          >
            <X size={19} />
          </SpringButton>
        </div>
        {children}
      </motion.div>
    </dialog>
  );
}
export function TextArrow({ children }: { children: ReactNode }) {
  return (
    <span className="text-arrow">
      {children}
      <ArrowUpRight size={16} />
    </span>
  );
}
