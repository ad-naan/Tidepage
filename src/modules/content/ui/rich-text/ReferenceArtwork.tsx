"use client";

import { useState, type ReactNode } from "react";

export function ReferenceArtwork({
  src,
  alt,
  fallback,
}: {
  src?: string;
  alt: string;
  fallback: ReactNode;
}) {
  const [failedSource, setFailedSource] = useState("");
  return src && src !== failedSource ? (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSource(src)}
    />
  ) : (
    fallback
  );
}
