"use client";
import type { Ref, ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { pressSpring } from "@/shared/lib/motion";
import styles from "./Button.module.css";

export type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  children?: ReactNode;
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
  const reduce = useReducedMotion();
  return (
    <motion.button
      {...props}
      ref={ref}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`${styles.root} ${styles[variant]} ${styles[size]} ${className}`}
      whileTap={
        reduce
          ? undefined
          : (whileTap ?? (pressEffect ? { scale: 0.97 } : undefined))
      }
      transition={transition ?? pressSpring}
    >
      {children}
      {busy && <span className={styles.spinner} aria-hidden="true" />}
    </motion.button>
  );
}

export type IconButtonProps = ButtonProps & { "aria-label": string };
export function IconButton({ className = "", ...props }: IconButtonProps) {
  return <Button {...props} className={`${styles.icon} ${className}`} />;
}
