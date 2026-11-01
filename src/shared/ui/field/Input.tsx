"use client";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import styles from "./Field.module.css";

type NativeProps = ComponentPropsWithoutRef<"input">;
export type InputProps = Omit<NativeProps, "size" | "type"> & {
  type?: Exclude<NativeProps["type"], "range" | "file">;
  appearance?: "bare" | "surface";
};
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", appearance = "surface", ...props },
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      className={`${styles.input} ${styles[appearance]} ${className}`}
    />
  );
});
export const FileInput = forwardRef<
  HTMLInputElement,
  Omit<NativeProps, "type">
>(function FileInput({ className = "", ...props }, ref) {
  return (
    <input
      {...props}
      ref={ref}
      type="file"
      className={`${styles.file} ${className}`}
    />
  );
});
export const RangeSlider = forwardRef<
  HTMLInputElement,
  Omit<NativeProps, "type"> & { "aria-label": string }
>(function RangeSlider({ className = "", ...props }, ref) {
  return (
    <input
      {...props}
      ref={ref}
      type="range"
      className={`${styles.range} ${className}`}
    />
  );
});
