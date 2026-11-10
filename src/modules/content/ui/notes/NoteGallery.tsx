"use client";
import { DateTime } from "@/shared/ui/typography/DateTime";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import type { Note } from "@/modules/content/domain/models";
import type { NoteImage } from "@/modules/content/domain/note-images";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import { ImageFrame, MediaImage } from "@/shared/ui/image/MediaImage";
import styles from "./NoteGallery.module.css";

export function NoteGallery({
  images,
  note,
}: {
  images: NoteImage[];
  note: Note;
}) {
  const t = useTranslations("notes.reader");
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const touch = useRef<{ x: number; y: number } | null>(null);
  const image = images[index];
  const move = (step: number) =>
    setIndex((current) => (current + step + images.length) % images.length);
  return (
    <section className={styles.gallery} aria-label={t("photos")}>
      <div
        className={styles.stage}
        role={images.length > 1 ? "group" : undefined}
        aria-label={
          images.length > 1
            ? t("photoPosition", { index: index + 1, total: images.length })
            : undefined
        }
        tabIndex={images.length > 1 ? 0 : undefined}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || images.length < 2) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(event.key === "ArrowLeft" ? -1 : 1);
          }
          if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            setIndex(event.key === "Home" ? 0 : images.length - 1);
          }
        }}
        onTouchStart={(event) => {
          if (event.touches.length !== 1) {
            touch.current = null;
            return;
          }
          const point = event.touches[0];
          touch.current = { x: point.clientX, y: point.clientY };
        }}
        onTouchCancel={() => {
          touch.current = null;
        }}
        onTouchEnd={(event) => {
          const start = touch.current;
          touch.current = null;
          if (!start || images.length < 2) return;
          const end = event.changedTouches[0];
          const dx = end.clientX - start.x;
          if (
            Math.abs(dx) > 48 &&
            Math.abs(dx) > Math.abs(end.clientY - start.y)
          )
            move(dx < 0 ? 1 : -1);
        }}
      >
        {image ? (
          failed[image.assetId] ? (
            <div className={styles.fallback} role="status">
              <ImageOff size={28} aria-hidden />
              <p>{t("imageUnavailable")}</p>
              <Button
                variant="quiet"
                onClick={() =>
                  setFailed((previous) => ({
                    ...previous,
                    [image.assetId]: false,
                  }))
                }
              >
                {t("retry")}
              </Button>
            </div>
          ) : (
            <ImageFrame
              className={styles.photo}
              fit="contain"
              sizes="(max-width: 700px) 90vw, (max-width: 1200px) 52vw, 610px"
              src={image.assetId}
              alt={
                image.alt ||
                t("photoPosition", { index: index + 1, total: images.length })
              }
              onUnavailable={() =>
                setFailed((previous) => ({
                  ...previous,
                  [image.assetId]: true,
                }))
              }
            />
          )
        ) : (
          <div className={styles.fallback}>
            <span className={styles.eyebrow}>{t("aMoment")}</span>
            <CoastalVignette kind={note.sketch} className={styles.sketch} />
            <p className={styles.noPhoto}>{t("wordsOnly")}</p>
            <DateTime value={note.publishedOn} />
          </div>
        )}
        {images.length > 1 && (
          <>
            <IconButton
              className={`${styles.arrow} ${styles.previous}`}
              aria-label={t("previousPhoto")}
              onClick={() => move(-1)}
            >
              <ChevronLeft size={20} />
            </IconButton>
            <IconButton
              className={`${styles.arrow} ${styles.next}`}
              aria-label={t("nextPhoto")}
              onClick={() => move(1)}
            >
              <ChevronRight size={20} />
            </IconButton>
          </>
        )}
      </div>
      {image && (
        <div className={styles.caption}>
          <p>{image.caption || image.alt}</p>
          <span role="status" aria-live="polite" aria-atomic="true">
            {t("photoPosition", { index: index + 1, total: images.length })}
          </span>
        </div>
      )}
      {images.length > 1 && (
        <div className={styles.thumbnails} aria-label={t("choosePhoto")}>
          {images.map((photo, i) => (
            <Button
              key={`${photo.assetId}-${i}`}
              className={styles.thumbnail}
              aria-label={t("photoPosition", {
                index: i + 1,
                total: images.length,
              })}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
              pressEffect={false}
            >
              <MediaImage
                src={photo.assetId}
                alt=""
                loading="lazy"
                sizes="44px"
              />
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
