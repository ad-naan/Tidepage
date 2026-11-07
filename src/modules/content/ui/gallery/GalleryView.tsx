"use client";
import { ProgressiveList } from "@/shared/ui/loading/ProgressiveList";
import { Button } from "@/shared/ui/button/Button";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import {
  PencilFrame,
  PencilLine,
  CoastGlyph,
} from "@/shared/ui/drawing/CoastalMarks";
import { ContentHeading } from "@/modules/content/ui/layout/ContentHeading";
import styles from "./GalleryView.module.css";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { listItemMotion } from "@/shared/lib/motion";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Camera, MapPin } from "lucide-react";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import {
  galleryCategories,
  type GalleryPhoto,
} from "@/modules/content/domain/gallery";
const galleryTabs = ["all", ...galleryCategories] as const;
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
      <ProgressiveList
        key={filter}
        items={filtered}
        className="masonry-gallery"
      >
        {(photo, i) => (
          <motion.figure key={photo.id} {...listItemMotion(i, reduced)}>
            <PencilFrame />
            <Button
              className="photo-button"
              onClick={() => setSelected(photo)}
              style={{ aspectRatio: photo.width / photo.height }}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading={i < 3 ? "eager" : "lazy"}
                decoding="async"
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
      </ProgressiveList>
      <p className="gallery-ending">
        {t("ending")}
        <CoastGlyph kind="wind" />
      </p>
      {selected && (
        <Dialog wide title={selected.title} onClose={() => setSelected(null)}>
          <div className="photo-lightbox">
            <img src={selected.src} alt={selected.alt} />
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
