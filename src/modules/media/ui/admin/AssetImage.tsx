"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { resolveLocalAsset } from "./local-assets";
export function AssetImage({
  id,
  alt,
  className,
}: {
  id: string;
  alt: string;
  className?: string;
}) {
  const t = useTranslations("admin.media");
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    let objectUrl = "";
    setUrl("");
    setFailed(false);
    resolveLocalAsset(id)
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
  return url ? (
    <img className={className} src={url} alt={alt} loading="lazy" />
  ) : (
    <span role="status">{t(failed ? "missing" : "loading")}</span>
  );
}
