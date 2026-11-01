import type { ComponentProps } from "react";
import styles from "./Anchor.module.css";
export function Anchor({ className = "", ...props }: ComponentProps<"a">) {
  return <a {...props} className={`${styles.link} ${className}`} />;
}
/** Public HTTP(S) links share safe new-tab defaults; locale routes use shared/i18n/Link. */
export function ExternalLink({
  target = "_blank",
  rel,
  className = "",
  ...props
}: ComponentProps<"a">) {
  const relationship = new Set((rel ?? "").split(/\s+/).filter(Boolean));
  if (target === "_blank") {
    relationship.add("noopener");
    relationship.add("noreferrer");
  }
  return (
    <Anchor
      {...props}
      target={target}
      rel={[...relationship].join(" ") || undefined}
      className={className}
    />
  );
}
