"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button/Button";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { Input } from "@/shared/ui/field/Input";
import { UploadField } from "@/shared/ui/field/UploadField";
import { Field } from "@/shared/ui/field/Field";
import { PencilFrame } from "@/shared/ui/drawing/CoastalMarks";
import type { ImageAsset } from "@/modules/media/domain/assets";
import {
  localImageUploader,
  listLocalAssets,
  archiveLocalAsset,
} from "./local-assets";
import { ImageCropDialog } from "./ImageCropDialog";
import { AssetImage } from "./AssetImage";
import styles from "./MediaPicker.module.css";
export function MediaPicker({
  onSelect,
  management = false,
}: {
  onSelect?: (asset: ImageAsset, alt: string) => void;
  management?: boolean;
}) {
  const t = useTranslations("admin.media");
  const [assets, setAssets] = useState<ImageAsset[]>([]);
  const [alt, setAlt] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const admin = useTranslations("admin");
  const [view, setView] = useState("active");
  const [cropping, setCropping] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ImageAsset | null>(null);
  const refresh = () =>
    listLocalAssets(management)
      .then(setAssets)
      .catch(() => setError(t("loadError")));
  useEffect(() => {
    void refresh();
    return () => controller.current?.abort();
  }, []);
  return (
    <div>
      <div className={styles.upload}>
        <Field id="media-file" label={t("upload")} description={t("help")}>
          <UploadField
            label={t("upload")}
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={progress !== null}
            onFiles={async (files) => {
              const file = files[0];
              if (!file) return;
              const task = new AbortController();
              controller.current = task;
              setProgress(0);
              setError("");
              try {
                await localImageUploader.upload(file, {
                  signal: task.signal,
                  onProgress: setProgress,
                });
                await refresh();
              } catch {
                if (!task.signal.aborted) setError(t("uploadError"));
              } finally {
                if (!task.signal.aborted) setProgress(null);
              }
            }}
          />
        </Field>
        {progress !== null && (
          <div className={styles.actions}>
            <progress value={progress} max={100} aria-label={t("progress")} />
            <Button
              onClick={() => {
                controller.current?.abort();
                setProgress(null);
              }}
            >
              {t("cancel")}
            </Button>
          </div>
        )}
        {onSelect && (
          <Field id="media-alt" label={t("alt")} description={t("altHelp")}>
            <Input value={alt} onChange={(e) => setAlt(e.target.value)} />
          </Field>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </div>
      {management && (
        <FilterTabs
          label={admin("crud.filter")}
          value={view}
          onChange={setView}
          options={[
            { value: "active", label: admin("crud.active") },
            { value: "trash", label: admin("crud.trash") },
          ]}
        />
      )}
      <div className={styles.mediaGrid}>
        {assets
          .filter((asset) =>
            view === "trash" ? !!asset.archived : !asset.archived,
          )
          .map((asset) => (
            <div key={asset.id} className={styles.mediaItem}>
              <PencilFrame />
              <AssetImage id={asset.id} alt={asset.name} />
              <p>{asset.name}</p>
              <small>
                {asset.width} × {asset.height} ·{" "}
                {(asset.size / 1024).toFixed(0)} KB
              </small>
              {onSelect && (
                <Button
                  variant="quiet"
                  size="sm"
                  disabled={!alt.trim()}
                  onClick={() => onSelect(asset, alt.trim())}
                >
                  {t("insert")}
                </Button>
              )}
              {management && (
                <div className={styles.actions}>
                  {asset.archived ? (
                    <Button
                      size="sm"
                      onClick={async () => {
                        await archiveLocalAsset(asset.id, false);
                        await refresh();
                      }}
                    >
                      {admin("crud.restore")}
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => setCropping(asset.id)}>
                        {admin("image.crop")}
                      </Button>
                      <Button size="sm" onClick={() => setDeleting(asset)}>
                        {admin("crud.delete")}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>
      {!assets.length && <p className={styles.empty}>{t("empty")}</p>}
      {cropping && (
        <ImageCropDialog
          assetId={cropping}
          onClose={() => setCropping(null)}
          onSave={() => {
            setCropping(null);
            void refresh();
          }}
        />
      )}
      {deleting && (
        <Dialog
          title={admin("crud.deleteTitle")}
          onClose={() => setDeleting(null)}
        >
          <p>{admin("crud.mediaHelp", { name: deleting.name })}</p>
          <Button
            variant="primary"
            onClick={async () => {
              try {
                await archiveLocalAsset(deleting.id, true);
                setDeleting(null);
                await refresh();
              } catch {
                setError(t("loadError"));
              }
            }}
          >
            {admin("crud.confirm")}
          </Button>
        </Dialog>
      )}
    </div>
  );
}
