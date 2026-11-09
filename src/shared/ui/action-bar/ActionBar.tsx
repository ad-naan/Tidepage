import type { ReactNode } from "react";
import styles from "./ActionBar.module.css";

export function ActionBar({
  context,
  children,
  sticky = false,
}: {
  context?: ReactNode;
  children: ReactNode;
  sticky?: boolean;
}) {
  return (
    <div className={styles.bar} data-sticky={sticky}>
      {context && <div className={styles.context}>{context}</div>}
      <div className={styles.actions}>{children}</div>
    </div>
  );
}
