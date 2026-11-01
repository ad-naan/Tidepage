import type { ComponentProps, ReactNode } from "react";
import styles from "./Disclosure.module.css";
/** Native disclosure keeps keyboard and expanded-state semantics without a second state store. */
export function Disclosure({
  summary,
  children,
  className = "",
  ...props
}: Omit<ComponentProps<"details">, "children"> & {
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <details {...props} className={`${styles.root} ${className}`}>
      <summary>{summary}</summary>
      {children}
    </details>
  );
}
