import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Text.module.css";

type Props = HTMLAttributes<HTMLElement> & {
  as?: "span" | "p" | "div" | "h1" | "h2" | "h3";
  variant?: "caption" | "body" | "title" | "display" | "reading";
  tone?: "default" | "muted" | "accent";
  children: ReactNode;
};
/** Semantic type roles; callers choose an HTML element independently of visual size. */
export function Text({
  as: Element = "span",
  variant = "body",
  tone = "default",
  className = "",
  children,
  ...props
}: Props) {
  return (
    <Element
      {...props}
      className={`${styles.text} ${styles[variant]} ${styles[tone]} ${className}`}
    >
      {children}
    </Element>
  );
}
