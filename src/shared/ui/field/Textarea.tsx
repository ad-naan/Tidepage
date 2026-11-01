"use client";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import styles from "./Field.module.css";
export type TextareaProps = ComponentPropsWithoutRef<"textarea"> & {
  appearance?: "bare" | "surface";
};
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className = "", appearance = "surface", ...props }, ref) {
    return (
      <textarea
        {...props}
        ref={ref}
        className={`${styles.input} ${styles[appearance]} ${className}`}
      />
    );
  },
);
