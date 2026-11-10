"use client";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import {
  PencilFrame,
  PencilLine,
  CoastGlyph,
} from "@/shared/ui/drawing/CoastalMarks";
import { ContentHeading } from "@/modules/content/ui/layout/ContentHeading";
import styles from "./GalleryView.module.css";
import { GalleryPhotoDetails } from "./GalleryPhotoDetails";
import { GalleryMasonry } from "./GalleryMasonry";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { listItemMotion } from "@/shared/lib/motion";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Camera, MapPin } from "lucide-react";
import { ImageViewer } from "@/shared/ui/dialog/ImageViewer";
import { ImageFrame } from "@/shared/ui/image/MediaImage";
import {
  galleryCategories,
  type GalleryPhoto,
} from "@/modules/content/domain/gallery";
const galleryTabs = ["all", ...galleryCategories] as const;
const tileSizes =
  "(max-width: 700px) 45vw, (max-width: 1050px) 30vw, (max-width: 1460px) 23vw, 310px";
type GalleryTab = (typeof galleryTabs)[number];
export function GalleryView({ photos }: { photos: GalleryPhoto[] }) {
  const t = useTranslations("gallery");
  const reduced = useReducedMotion();
  const [filter, setFilter] = useState<GalleryTab>("all");
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);
  const filtered = photos.filter(
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
        <PencilLine className="toolbar-shore" />
      </div>
      <div className="gallery-meta">
        <span>
          <Camera size={13} />
          {t("count", { count: filtered.length })}
        </span>
      </div>
      {!filtered.length && <p className="empty-state">{t("empty")}</p>}
      <GalleryMasonry key={filter} photos={filtered}>
        {(photo, i) => (
          <motion.figure key={photo.id} {...listItemMotion(i, reduced)}>
            <PencilFrame />
            <Button
              className="photo-button"
              onClick={() => setSelected(photo)}
              style={{ aspectRatio: photo.width / photo.height }}
            >
              <ImageFrame
                src={photo.src}
                alt={photo.alt}
                fit="cover"
                sizes={tileSizes}
                width={photo.width}
                height={photo.height}
                loading={i === 0 ? "eager" : "lazy"}
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
            </figcaption>
          </motion.figure>
        )}
      </GalleryMasonry>
      <p className="gallery-ending">
        {t("ending")}
        <CoastGlyph kind="wind" />
      </p>
      {selected && (
        <ImageViewer
          title={selected.title}
          src={selected.src}
          alt={selected.alt}
          aspectRatio={selected.width / selected.height}
          previewSizes={tileSizes}
          onClose={() => setSelected(null)}
          details={{
            label: t("capture.title"),
            content: <GalleryPhotoDetails photo={selected} />,
          }}
          navigation={
            filtered.length > 1 && (
              <>
                <IconButton
                  onClick={() => next(-1)}
                  aria-label={t("previous")}
                  title={t("previous")}
                >
                  <ChevronLeft size={18} />
                </IconButton>
                <span aria-live="polite">
                  {filtered.findIndex((p) => p.id === selected.id) + 1} /{" "}
                  {filtered.length}
                </span>
                <IconButton
                  onClick={() => next(1)}
                  aria-label={t("next")}
                  title={t("next")}
                >
                  <ChevronRight size={18} />
                </IconButton>
              </>
            )
          }
        />
      )}
    </div>
  );
}
