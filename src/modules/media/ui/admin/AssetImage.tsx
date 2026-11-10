"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Expand } from "lucide-react";
import { Button } from "@/shared/ui/button/Button";
import { ImageViewer } from "@/shared/ui/dialog/ImageViewer";
import { isUploadedAssetId } from "@/shared/contracts/asset-path";
import { MediaImage } from "@/shared/ui/image/MediaImage";
import styles from "./AssetImage.module.css";
export function AssetImage({
  id,
  alt,
  className,
  preview = false,
  sizes,
}: {
  id: string;
  alt: string;
  className?: string;
  preview?: boolean;
  sizes?: string;
}) {
  const t = useTranslations("admin.media");
  const viewer = useTranslations("articleBlocks");
  const [openId, setOpenId] = useState<string>();
  const [failedId, setFailedId] = useState<string>();
  if (!isUploadedAssetId(id) || id === failedId)
    return <span role="status">{t("missing")}</span>;
  if (!preview)
    return (
      <MediaImage
        className={className}
        src={id}
        alt={alt}
        sizes={sizes}
        loading="lazy"
        onUnavailable={() => setFailedId(id)}
      />
    );
  return (
    <>
      <Button
        variant="bare"
        className={styles.preview}
        aria-label={viewer("enlargeImage", { alt: alt || viewer("image") })}
        onClick={() => setOpenId(id)}
        pressEffect={false}
      >
        <MediaImage
          src={id}
          alt={alt}
          sizes="192px"
          loading="lazy"
          onUnavailable={() => setFailedId(id)}
        />
        <span className={styles.expand}>
          <Expand size={15} aria-hidden="true" />
        </span>
      </Button>
      {openId === id && (
        <ImageViewer
          title={alt || viewer("image")}
          src={id}
          previewSizes="192px"
          alt={alt}
          onClose={() => setOpenId(undefined)}
        />
      )}
    </>
  );
}
