"use client";
import { useState } from "react";
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
        <img
          src={src}
          alt=""
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(src)}
        />
      )}
    </span>
  );
}
