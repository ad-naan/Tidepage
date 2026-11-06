import type { ComponentProps } from "react";
import type { LinkPreview } from "@/shared/contracts/link-preview";
import styles from "./Anchor.module.css";
export function Anchor({ className = "", ...props }: ComponentProps<"a">) {
  return <a {...props} className={`${styles.link} ${className}`} />;
}
/** Public HTTP(S) links share safe new-tab defaults; locale routes use shared/i18n/Link. */
export function ExternalLink({
  target = "_blank",
  rel,
  className = "",
  preview,
  ...props
}: ComponentProps<"a"> & { preview?: LinkPreview | false }) {
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
      data-link-preview={preview === false ? "off" : preview ? JSON.stringify(preview) : undefined}
    />
  );
}
