"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button/Button";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import { ConfirmDialog } from "@/shared/ui/dialog/ConfirmDialog";
import { Input } from "@/shared/ui/field/Input";
import { UploadField } from "@/shared/ui/field/UploadField";
import { Field } from "@/shared/ui/field/Field";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
import { PencilFrame } from "@/shared/ui/drawing/CoastalMarks";
import type { ImageAsset } from "@/modules/media/domain/assets";
import { imageUploader, listAssets, archiveAsset } from "./media-client";
import { ImageCropDialog } from "./ImageCropDialog";
import { AssetImage } from "./AssetImage";
import styles from "./MediaPicker.module.css";
export function MediaPicker({
  onSelect,
  management = false,
  pickOnUpload = false,
}: {
  onSelect?: (asset: ImageAsset, alt: string) => void;
  management?: boolean;
  pickOnUpload?: boolean;
}) {
  const t = useTranslations("admin.media");
  const [assets, setAssets] = useState<ImageAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [alt, setAlt] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const admin = useTranslations("admin");
  const [view, setView] = useState("active");
  const [cropping, setCropping] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ImageAsset | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState(false);
  async function refresh(signal?: AbortSignal) {
    try {
      const next = await listAssets(management, signal);
      if (!signal?.aborted) {
        setAssets(next);
        setListError(false);
      }
    } catch {
      if (!signal?.aborted) setListError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    const task = new AbortController();
    void refresh(task.signal);
    return () => {
      task.abort();
      controller.current?.abort();
    };
  }, [management]);
  const visibleAssets = assets.filter(
    (asset) => !!asset.archived === (view === "trash"),
  );
  return (
    <div className={onSelect ? styles.picker : undefined}>
      <div className={styles.upload}>
        <Field id="media-file" label={t("upload")} description={t("help")}>
          <UploadField
            label={t("upload")}
            pasteImages
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
                const asset = await imageUploader.upload(file, {
                  signal: task.signal,
                  onProgress: setProgress,
                });
                if (task.signal.aborted) return;
                if (pickOnUpload && onSelect) onSelect(asset, "");
                else await refresh(task.signal);
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
              variant="quiet"
              onClick={() => {
                controller.current?.abort();
                setProgress(null);
              }}
            >
              {t("cancel")}
            </Button>
          </div>
        )}
        {onSelect && !pickOnUpload && (
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
      <div className={styles.results} aria-busy={loading}>
        {loading && <LoadingSkeleton variant="cards" />}
        {listError && (
          <p role="alert" className={styles.error}>
            {t("loadError")}
          </p>
        )}
        {!loading && !listError && !visibleAssets.length && (
          <p className={styles.empty}>{t("empty")}</p>
        )}
        {!!visibleAssets.length && (
          <div className={styles.mediaGrid}>
            {visibleAssets.map((asset) => (
              <div key={asset.id} className={styles.mediaItem}>
                <PencilFrame />
                <AssetImage id={asset.id} alt={asset.name} sizes="200px" />
                <p>{asset.name}</p>
                <small>
                  {asset.width} × {asset.height} ·{" "}
                  {(asset.size / 1024).toFixed(0)} KB
                </small>
                {onSelect && (
                  <Button
                    variant="quiet"
                    size="sm"
                    disabled={!pickOnUpload && !alt.trim()}
                    onClick={() => onSelect(asset, alt.trim())}
                  >
                    {t("insert")}
                  </Button>
                )}
                {management && (
                  <div className={styles.actions}>
                    {asset.archived ? (
                      <Button
                        variant="quiet"
                        size="sm"
                        onClick={async () => {
                          await archiveAsset(asset.id, false);
                          await refresh();
                        }}
                      >
                        {admin("crud.restore")}
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="quiet"
                          size="sm"
                          onClick={() => setCropping(asset.id)}
                        >
                          {admin("image.crop")}
                        </Button>
                        <Button
                          variant="quiet"
                          size="sm"
                          onClick={() => {
                            setArchiveError(false);
                            setDeleting(asset);
                          }}
                        >
                          {admin("crud.delete")}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
        <ConfirmDialog
          title={admin("crud.mediaTitle")}
          description={admin("crud.mediaHelp", { name: deleting.name })}
          cancelLabel={admin("crud.cancel")}
          confirmLabel={admin("crud.mediaArchive")}
          danger
          busy={archiving}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            setArchiving(true);
            setArchiveError(false);
            try {
              await archiveAsset(deleting.id, true);
              setDeleting(null);
              await refresh();
            } catch {
              setArchiveError(true);
            } finally {
              setArchiving(false);
            }
          }}
        >
          {archiveError && <p role="alert">{admin("crud.mediaFailed")}</p>}
        </ConfirmDialog>
      )}
    </div>
  );
}
