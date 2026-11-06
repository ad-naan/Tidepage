import type { ReactNode } from "react";
import styles from "./Signature.module.css";

export type SignatureSize = "inline" | "sm" | "md" | "hero";
export function Signature({
  children,
  size = "md",
  className = "",
}: {
  children: ReactNode;
  size?: SignatureSize;
  className?: string;
}) {
  return (
    <span className={`${styles.signature} ${styles[size]} ${className}`}>
      {children}
    </span>
  );
}
