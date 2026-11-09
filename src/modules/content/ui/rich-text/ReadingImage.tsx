"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Expand } from "lucide-react";
import { Button } from "@/shared/ui/button/Button";
import { ImageViewer } from "@/shared/ui/dialog/ImageViewer";
import styles from "./ReadingImage.module.css";

export function ReadingImage({
  src,
  alt,
  caption,
  width = 100,
  align = "center",
}: {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  align?: string;
}) {
  const t = useTranslations("articleBlocks");
  const [open, setOpen] = useState(false);
  const safeWidth = Number.isFinite(width)
    ? Math.max(20, Math.min(100, width))
    : 100;
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
          <img src={src} alt={alt} loading="lazy" />
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
        />
      )}
    </>
  );
}
