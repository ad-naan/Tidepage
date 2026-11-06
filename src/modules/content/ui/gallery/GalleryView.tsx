"use client";
import { ProgressiveList } from "@/shared/ui/loading/ProgressiveList";
import { FileInput } from "@/shared/ui/field/Input";
import { Button } from "@/shared/ui/button/Button";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import {
  PencilFrame,
  PencilLine,
  CoastGlyph,
} from "@/shared/ui/drawing/CoastalMarks";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import { ContentHeading } from "@/modules/content/ui/layout/ContentHeading";
import styles from "./GalleryView.module.css";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Heart,
  MapPin,
  Upload,
} from "lucide-react";
import { Dialog } from "@/shared/ui/dialog/Dialog";
type PhotoCategory = "daily" | "nature" | "travel";
type Photo = {
  id: string;
  src: string;
  title: string;
  caption: string;
  place: string;
  category: PhotoCategory;
  ratio: string;
  position?: string;
};
const galleryTabs = ["all", "daily", "nature", "travel"] as const;
type GalleryTab = (typeof galleryTabs)[number];
export function GalleryView() {
  const t = useTranslations("gallery");
  const [displayed, setItems] = useState<Photo[]>([]);
  const [filter, setFilter] = useState<GalleryTab>("all");
  const [selected, setSelected] = useState<Photo | null>(null);
  const [liked, setLiked] = useState<string[]>([]);
  const { notify } = useNotice();
  const localUrls = useRef<string[]>([]);
  useEffect(
    () => () => localUrls.current.forEach((u) => URL.revokeObjectURL(u)),
    [],
  );
  const filtered = displayed.filter(
    (p) => filter === "all" || p.category === filter,
  );
  function next(n: number) {
    if (!selected) return;
    const i = filtered.findIndex((p) => p.id === selected.id);
    setSelected(filtered[(i + n + filtered.length) % filtered.length]);
  }
  return (
    <div className={`inner-page gallery-page ${styles.gallery}`}>
      <ContentHeading
        room="gallery"
        title={t("title")}
        description={t("subtitle")}
      />
      <div className="gallery-toolbar">
        <FilterTabs
          value={filter}
          options={galleryTabs.map((value) => ({
            value,
            label: t(`tabs.${value}`),
          }))}
          label={t("filterLabel")}
          onChange={setFilter}
        />
        <label className="gallery-upload">
          <Upload size={13} />
          <span>{t("upload")}</span>
          <FileInput
            accept="image/jpeg,image/png,image/webp,image/avif"
            aria-label={t("uploadAria")}
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              const newPhotos: Photo[] = [];
              for (const file of files) {
                if (file.size > 15 * 1024 * 1024) {
                  notify({
                    title: t("sizeError"),
                    tone: "error",
                    duration: 6500,
                  });
                  continue;
                }
                const src = URL.createObjectURL(file);
                localUrls.current.push(src);
                newPhotos.push({
                  id: src,
                  src,
                  title: file.name.replace(/\.[^.]+$/, ""),
                  caption: t("defaultCaption"),
                  place: t("myPhotos"),
                  category: "daily",
                  ratio: "3/4",
                });
              }
              setItems((v) => [...newPhotos, ...v]);
              setFilter("all");
              if (newPhotos.length)
                notify({
                  title: t("added"),
                  detail: t("notice"),
                  tone: "success",
                  duration: 6500,
                });
              e.target.value = "";
            }}
          />
        </label>
        <PencilLine className="toolbar-shore" />
      </div>
      <div className="gallery-meta">
        <span>
          <Camera size={13} />
          {t("count", { count: filtered.length })}
        </span>
        <span>{t("source")}</span>
      </div>
      <ProgressiveList
        key={filter}
        items={filtered}
        className="masonry-gallery"
      >
        {(photo, i) => (
          <motion.figure
            key={photo.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 5) * 0.05 }}
          >
            <PencilFrame />
            <Button
              className="photo-button"
              onClick={() => setSelected(photo)}
              style={{ aspectRatio: photo.ratio }}
            >
              <img
                src={photo.src}
                alt={photo.title}
                loading={i < 3 ? "eager" : "lazy"}
                style={{
                  objectPosition: photo.position,
                  transform: photo.position ? "scale(1.5)" : undefined,
                }}
              />
              <span className="photo-overlay">
                <MapPin size={12} />
                {photo.place}
                <span>↗</span>
              </span>
            </Button>
            <figcaption>
              <PencilLine kind="fold" className="photo-fold" />
              <div>
                <h3>{photo.title}</h3>
                <p>{photo.place}</p>
              </div>
              <Button
                className={liked.includes(photo.id) ? "liked" : ""}
                aria-label={
                  liked.includes(photo.id)
                    ? t("unlike", { title: photo.title })
                    : t("like", { title: photo.title })
                }
                onClick={() =>
                  setLiked((v) =>
                    v.includes(photo.id)
                      ? v.filter((id) => id !== photo.id)
                      : [...v, photo.id],
                  )
                }
              >
                <Heart
                  size={14}
                  fill={liked.includes(photo.id) ? "currentColor" : "none"}
                />
              </Button>
            </figcaption>
          </motion.figure>
        )}
      </ProgressiveList>
      <p className="gallery-ending">
        {t("ending")}
        <CoastGlyph kind="wind" />
      </p>
      {selected && (
        <Dialog wide title={selected.title} onClose={() => setSelected(null)}>
          <div className="photo-lightbox">
            <img src={selected.src} alt={selected.title} />
            <div className="lightbox-caption">
              <p>{selected.caption}</p>
              <span>
                <MapPin size={12} />
                {selected.place}
              </span>
            </div>
            <div className="lightbox-controls">
              <Button onClick={() => next(-1)} aria-label={t("previous")}>
                <ArrowLeft size={18} />
              </Button>
              <span>
                {filtered.findIndex((p) => p.id === selected.id) + 1} /{" "}
                {filtered.length}
              </span>
              <Button onClick={() => next(1)} aria-label={t("next")}>
                <ArrowRight size={18} />
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
