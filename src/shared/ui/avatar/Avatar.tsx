"use client";
import { useState } from "react";
import { MediaImage } from "@/shared/ui/image/MediaImage";
import styles from "./Avatar.module.css";

/** Adjacent names provide the accessible label; a failed image keeps its footprint. */
export function Avatar({
  src,
  name,
  size = "md",
  className = "",
}: {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span
      className={`${styles.root} ${styles[size]} ${className}`}
      aria-hidden="true"
    >
      <span>{Array.from(name.trim())[0]?.toUpperCase() || "·"}</span>
      {src && src !== failed && (
        <MediaImage
          src={src}
          alt=""
          sizes={size === "lg" ? "48px" : size === "sm" ? "22px" : "32px"}
          referrerPolicy="no-referrer"
          onUnavailable={() => setFailed(src)}
        />
      )}
    </span>
  );
}
