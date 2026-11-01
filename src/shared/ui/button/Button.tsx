"use client";
import type { Ref } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { spring } from "@/shared/lib/motion";
import styles from "./Button.module.css";

export type ButtonProps = HTMLMotionProps<"button"> & {
  ref?: Ref<HTMLButtonElement>;
  variant?: "bare" | "quiet" | "primary";
  size?: "sm" | "md";
  busy?: boolean;
  /** Decorative scene hotspots can opt out of the common press effect. */
  pressEffect?: boolean;
};

/** All action controls share native semantics, pending guards, focus and reduced-motion handling. */
export function Button({
  ref,
  type = "button",
  variant = "bare",
  size = "md",
  busy = false,
  disabled,
  className = "",
  children,
  pressEffect = true,
  whileTap,
  transition,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      {...props}
      ref={ref}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`${styles.root} ${styles[variant]} ${styles[size]} ${className}`}
      whileTap={whileTap ?? (pressEffect ? { scale: 0.96 } : undefined)}
      transition={transition ?? spring}
    >
      {children}
    </motion.button>
  );
}

export type IconButtonProps = ButtonProps & { "aria-label": string };
export function IconButton({ className = "", ...props }: IconButtonProps) {
  return <Button {...props} className={`${styles.icon} ${className}`} />;
}
