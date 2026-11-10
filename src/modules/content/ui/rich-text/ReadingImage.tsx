"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Expand } from "lucide-react";
import { Button } from "@/shared/ui/button/Button";
import { ImageViewer } from "@/shared/ui/dialog/ImageViewer";
import { ImageFrame } from "@/shared/ui/image/MediaImage";
import type { ImageDimensions } from "@/shared/contracts/image-dimensions";
import styles from "./ReadingImage.module.css";

export function ReadingImage({
  src,
  alt,
  caption,
  width = 100,
  align = "center",
  dimensions,
  priority = false,
}: {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  align?: string;
  dimensions?: ImageDimensions;
  priority?: boolean;
}) {
  const t = useTranslations("articleBlocks");
  const [open, setOpen] = useState(false);
  const safeWidth = Number.isFinite(width)
    ? Math.max(20, Math.min(100, width))
    : 100;
  const sizes = `(max-width: 960px) ${Math.ceil(safeWidth * 0.92)}vw, ${Math.ceil(((priority ? 1320 : 800) * safeWidth) / 100)}px`;
  return (
    <>
      <figure
        className={styles.figure}
        style={{ width: `${safeWidth}%` }}
        data-align={align}
      >
        <Button
          variant="bare"
          className={styles.zoom}
          aria-label={t("enlargeImage", { alt })}
          onClick={() => setOpen(true)}
          pressEffect={false}
        >
          <ImageFrame
            src={src}
            alt={alt}
            sizes={sizes}
            width={dimensions?.width}
            height={dimensions?.height}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
          />
          <span className={styles.expand}>
            <Expand size={16} aria-hidden="true" />
          </span>
        </Button>
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
      {open && (
        <ImageViewer
          title={caption || alt || t("image")}
          onClose={() => setOpen(false)}
          src={src}
          alt={alt}
          previewSizes={sizes}
          aspectRatio={dimensions && dimensions.width / dimensions.height}
        />
      )}
    </>
  );
}
