"use client";
import { useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { useTranslations } from "next-intl";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { Button } from "@/shared/ui/button/Button";
import { RangeSlider } from "@/shared/ui/field/Input";
import { Select } from "@/shared/ui/select/Select";
import { localImageUploader, resolveLocalAsset } from "./local-assets";
import type { ImageAsset } from "@/modules/media/domain/assets";
import styles from "./ImageCropDialog.module.css";
export function ImageCropDialog({
  assetId,
  onClose,
  onSave,
}: {
  assetId: string;
  onClose: () => void;
  onSave: (asset: ImageAsset) => void;
}) {
  const t = useTranslations("admin.image");
  const [source, setSource] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [aspect, setAspect] = useState("original");
  const [ratio, setRatio] = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const controller = useRef(new AbortController());
  useEffect(() => {
    controller.current = new AbortController();
    let live = true;
    let url = "";
    resolveLocalAsset(assetId)
      .then(async (blob) => {
        const bitmap = await createImageBitmap(blob);
        if (live) {
          setRatio(bitmap.width / bitmap.height);
          url = URL.createObjectURL(blob);
          setSource(url);
        }
        bitmap.close();
      })
      .catch(() => {
        if (live) setError(true);
      });
    return () => {
      live = false;
      controller.current.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [assetId]);
  async function apply() {
    if (!pixels || !source) return;
    setBusy(true);
    try {
      const blob = await resolveLocalAsset(assetId);
      const bitmap = await createImageBitmap(blob);
      let output: Blob;
      try {
        const scale = Math.min(1, 4096 / Math.max(pixels.width, pixels.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(pixels.width * scale));
        canvas.height = Math.max(1, Math.round(pixels.height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("CANVAS_UNAVAILABLE");
        context.drawImage(
          bitmap,
          pixels.x,
          pixels.y,
          pixels.width,
          pixels.height,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        output = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (value) =>
              value ? resolve(value) : reject(new Error("CROP_FAILED")),
            "image/png",
          ),
        );
      } finally {
        bitmap.close();
      }
      controller.current.signal.throwIfAborted();
      const asset = await localImageUploader.upload(
        new File([output], `crop-${Date.now()}.png`, { type: "image/png" }),
        { signal: controller.current.signal, onProgress: () => {} },
      );
      if (!controller.current.signal.aborted) onSave(asset);
    } catch {
      if (!controller.current.signal.aborted) setError(true);
    } finally {
      if (!controller.current.signal.aborted) setBusy(false);
    }
  }
  return (
    <Dialog
      title={t("cropTitle")}
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <div className={styles.layout}>
        <p className={styles.help}>{t("cropHelp")}</p>
        {source && (
          <div className={styles.canvas}>
            <Cropper
              image={source}
              crop={crop}
              zoom={zoom}
              minZoom={minZoom}
              maxZoom={minZoom * 3}
              onMediaLoaded={(media) => {
                const fit = Math.max(
                  1,
                  240 / Math.min(media.width, media.height),
                );
                setMinZoom(fit);
                setZoom(fit);
              }}
              aspect={aspect === "original" ? ratio : Number(aspect)}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_area, pixels) => setPixels(pixels)}
              zoomWithScroll={false}
              cropperProps={{ tabIndex: 0, "aria-label": t("cropArea") }}
              mediaProps={{ alt: t("cropArea") }}
            />
          </div>
        )}
        <div className={styles.controls}>
          <Select
            label={t("ratio")}
            value={aspect}
            options={[
              ["original", t("original")],
              ["1", "1:1"],
              [String(4 / 3), "4:3"],
              [String(16 / 9), "16:9"],
              [String(3 / 4), "3:4"],
            ].map(([value, label]) => ({ value, label }))}
            onValueChange={(value) => {
              setAspect(value);
              setCrop({ x: 0, y: 0 });
              setZoom(minZoom);
            }}
          />
          <label>
            {t("zoom")} {(zoom / minZoom).toFixed(1)}×
            <RangeSlider
              aria-label={t("zoom")}
              min={minZoom}
              max={minZoom * 3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>
        </div>
        {pixels && (
          <p className={styles.help}>
            {t("dimensions", {
              width: Math.round(pixels.width),
              height: Math.round(pixels.height),
            })}
          </p>
        )}
        {error && <p role="alert">{t("failed")}</p>}
        <div className={styles.actions}>
          <Button variant="quiet" disabled={busy} onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            variant="primary"
            busy={busy}
            disabled={!pixels}
            onClick={apply}
          >
            {t("apply")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
