import type { ReactNode } from "react";
import styles from "./Field.module.css";
/** Pass `${id}-description` / `${id}-error` to the control's aria-describedby. */
export function Field({
  id,
  label,
  description,
  error,
  children,
}: {
  id: string;
  label: string;
  description?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children}
      {description && <p id={`${id}-description`}>{description}</p>}
      {error && (
        <p id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
