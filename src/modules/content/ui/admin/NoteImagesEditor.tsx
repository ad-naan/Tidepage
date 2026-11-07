"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import type { NoteImage } from "@/modules/content/domain/note-images";
import { imageUploader } from "@/modules/media/ui/admin/media-client";
import { MediaPicker } from "@/modules/media/ui/admin/MediaPicker";
import { AssetImage } from "@/modules/media/ui/admin/AssetImage";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { UploadField } from "@/shared/ui/field/UploadField";
import { Field } from "@/shared/ui/field/Field";
import { Input } from "@/shared/ui/field/Input";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import styles from "./NoteImagesEditor.module.css";

export function NoteImagesEditor({
  images,
  onChange,
  onBusyChange,
}: {
  images: NoteImage[];
  onChange: (images: NoteImage[]) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const t = useTranslations("admin.noteImages");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState(false);
  const [progress, setProgress] = useState(0);
  const task = useRef<AbortController | null>(null);
  const latest = useRef({ images, onChange });
  latest.current = { images, onChange };
  useEffect(() => () => task.current?.abort(), []);
  function append(image: NoteImage) {
    const current = latest.current;
    if (
      current.images.length >= 20 ||
      current.images.some((item) => item.assetId === image.assetId)
    )
      return;
    const next = [...current.images, image];
    latest.current = { ...current, images: next };
    current.onChange(next);
  }
  async function upload(files: File[]) {
    if (uploading) return;
    if (files.length + images.length > 20) {
      setError(t("limit"));
      return;
    }
    const controller = new AbortController();
    task.current = controller;
    setUploading(true);
    onBusyChange(true);
    setProgress(0);
    setError("");
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const asset = await imageUploader.upload(file, {
          signal: controller.signal,
          onProgress: (value) =>
            setProgress(Math.round((i * 100 + value) / files.length)),
        });
        controller.signal.throwIfAborted();
        append({ assetId: asset.id, alt: "", caption: "" });
      }
    } catch {
      if (!controller.signal.aborted) setError(t("failed"));
    } finally {
      if (!controller.signal.aborted) {
        setUploading(false);
        onBusyChange(false);
      }
    }
  }
  function move(index: number, step: number) {
    const next = [...images];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    onChange(next);
  }
  return (
    <section className={styles.editor} aria-label={t("title")}>
      <div>
        <h3>{t("title")}</h3>
        <p className={styles.help}>{t("help")}</p>
      </div>
      <div className={styles.toolbar}>
        <UploadField
          label={t("upload")}
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif"
          disabled={uploading || images.length >= 20}
          onFiles={(files) => void upload(files)}
        />
        <Button
          variant="quiet"
          disabled={uploading || images.length >= 20}
          onClick={() => setPicker(true)}
        >
          {t("library")}
        </Button>
        {uploading && (
          <>
            <progress aria-label={t("progress")} max={100} value={progress} />
            <Button
              variant="quiet"
              onClick={() => {
                task.current?.abort();
                setUploading(false);
                onBusyChange(false);
              }}
            >
              {t("cancel")}
            </Button>
          </>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      {!images.length && <p className={styles.help}>{t("empty")}</p>}
      <ol className={styles.list}>
        {images.map((image, index) => (
          <li key={image.assetId} className={styles.item}>
            <div className={styles.preview}>
              <AssetImage id={image.assetId} alt={image.alt} />
              <span>
                {t(index === 0 ? "cover" : "position", { index: index + 1 })}
              </span>
            </div>
            <div className={styles.fields}>
              <Field
                id={`note-image-alt-${index}`}
                label={t("alt")}
                description={t("altHelp")}
              >
                <Input
                  value={image.alt}
                  maxLength={300}
                  disabled={uploading}
                  onChange={(event) =>
                    onChange(
                      images.map((item, i) =>
                        i === index
                          ? { ...item, alt: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
              <Field id={`note-image-caption-${index}`} label={t("caption")}>
                <Input
                  value={image.caption}
                  maxLength={500}
                  disabled={uploading}
                  onChange={(event) =>
                    onChange(
                      images.map((item, i) =>
                        i === index
                          ? { ...item, caption: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
            </div>
            <div className={styles.controls}>
              <IconButton
                aria-label={t("moveUp", { index: index + 1 })}
                disabled={uploading || index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp size={16} />
              </IconButton>
              <IconButton
                aria-label={t("moveDown", { index: index + 1 })}
                disabled={uploading || index === images.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown size={16} />
              </IconButton>
              <IconButton
                aria-label={t("remove", { index: index + 1 })}
                disabled={uploading}
                onClick={() => onChange(images.filter((_, i) => i !== index))}
              >
                <X size={16} />
              </IconButton>
            </div>
          </li>
        ))}
      </ol>
      {picker && (
        <Dialog title={t("library")} wide onClose={() => setPicker(false)}>
          <MediaPicker
            onSelect={(asset, alt) => {
              append({ assetId: asset.id, alt, caption: "" });
              setPicker(false);
            }}
          />
        </Dialog>
      )}
    </section>
  );
}
