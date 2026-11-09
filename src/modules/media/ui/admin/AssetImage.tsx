"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Expand } from "lucide-react";
import { Button } from "@/shared/ui/button/Button";
import { ImageViewer } from "@/shared/ui/dialog/ImageViewer";
import { resolveAsset } from "./media-client";
import styles from "./AssetImage.module.css";
export function AssetImage({
  id,
  alt,
  className,
  preview = false,
}: {
  id: string;
  alt: string;
  className?: string;
  preview?: boolean;
}) {
  const t = useTranslations("admin.media");
  const viewer = useTranslations("articleBlocks");
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    let objectUrl = "";
    setUrl("");
    setFailed(false);
    setOpen(false);
    resolveAsset(id)
      .then((blob) => {
        if (live) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  if (!url)
    return <span role="status">{t(failed ? "missing" : "loading")}</span>;
  if (!preview)
    return <img className={className} src={url} alt={alt} loading="lazy" />;
  return (
    <>
      <Button
        variant="bare"
        className={styles.preview}
        aria-label={viewer("enlargeImage", { alt: alt || viewer("image") })}
        onClick={() => setOpen(true)}
        pressEffect={false}
      >
        <img src={url} alt={alt} loading="lazy" />
        <span className={styles.expand}>
          <Expand size={15} aria-hidden="true" />
        </span>
      </Button>
      {open && (
        <ImageViewer
          title={alt || viewer("image")}
          src={url}
          alt={alt}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
