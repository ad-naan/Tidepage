"use client";

import { useState, type ReactNode } from "react";
import { MediaImage } from "@/shared/ui/image/MediaImage";

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
    <MediaImage
      src={src}
      alt={alt}
      loading="lazy"
      sizes="120px"
      referrerPolicy="no-referrer"
      onUnavailable={() => setFailedSource(src)}
    />
  ) : (
    fallback
  );
}
