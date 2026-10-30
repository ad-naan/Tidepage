"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useMessages, useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Heart,
  MapPin,
  Upload,
  X,
} from "lucide-react";
import { Dialog, PageHeading } from "@/shared/ui/primitives";
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
export function Gallery() {
  const t = useTranslations("gallery");
  const texts = useMessages().gallery.items;
  const photos: Photo[] = [
    {
      id: "sea",
      src: "/images/coast.png",
      title: texts.sea.title,
      caption: texts.sea.caption,
      place: texts.sea.place,
      category: "travel",
      ratio: "3/4",
    },
    {
      id: "coffee",
      src: "/images/window.png",
      title: texts.coffee.title,
      caption: texts.coffee.caption,
      place: texts.coffee.place,
      category: "daily",
      ratio: "4/5",
    },
    {
      id: "meadow",
      src: "/images/meadow.png",
      title: texts.meadow.title,
      caption: texts.meadow.caption,
      place: texts.meadow.place,
      category: "nature",
      ratio: "4/3",
    },
    {
      id: "light",
      src: "/images/window.png",
      title: texts.light.title,
      caption: texts.light.caption,
      place: texts.light.place,
      category: "daily",
      ratio: "1/1",
      position: "50% 18%",
    },
    {
      id: "flowers",
      src: "/images/meadow.png",
      title: texts.flowers.title,
      caption: texts.flowers.caption,
      place: texts.flowers.place,
      category: "nature",
      ratio: "3/4",
      position: "20% 80%",
    },
    {
      id: "horizon",
      src: "/images/coast.png",
      title: texts.horizon.title,
      caption: texts.horizon.caption,
      place: texts.horizon.place,
      category: "travel",
      ratio: "4/3",
      position: "50% 30%",
    },
  ];
  const [displayed, setItems] = useState<Photo[]>(photos);
  const [filter, setFilter] = useState<GalleryTab>("all");
  const [selected, setSelected] = useState<Photo | null>(null);
  const [liked, setLiked] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
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
    <div className="inner-page gallery-page">
      <PageHeading title={t("title")} description={t("subtitle")} />
      <div className="gallery-toolbar">
        <div className="tabs">
          {galleryTabs.map((c) => (
            <button
              key={c}
              className={filter === c ? "selected" : ""}
              onClick={() => setFilter(c)}
            >
              {t(`tabs.${c}`)}
              {filter === c && (
                <motion.span layoutId="gallery-tab" className="tab-underline" />
              )}
            </button>
          ))}
        </div>
        <label className="gallery-upload">
          <Upload size={13} />
          <span>{t("upload")}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            aria-label={t("uploadAria")}
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              const newPhotos: Photo[] = [];
              for (const file of files) {
                if (file.size > 15 * 1024 * 1024) {
                  setNotice(t("sizeError"));
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
              if (newPhotos.length) setNotice(t("notice"));
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <div className="gallery-meta">
        <span>
          <Camera size={13} />
          {t("count", { count: filtered.length })}
        </span>
        <span>{t("source")}</span>
      </div>
      {notice && (
        <div className="gallery-notice" role="status">
          {notice}
          <button aria-label={t("closeNotice")} onClick={() => setNotice("")}>
            <X size={13} />
          </button>
        </div>
      )}
      <div className="masonry-gallery">
        {filtered.map((photo, i) => (
          <motion.figure
            key={photo.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <button
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
            </button>
            <figcaption>
              <div>
                <h3>{photo.title}</h3>
                <p>{photo.place}</p>
              </div>
              <button
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
              </button>
            </figcaption>
          </motion.figure>
        ))}
      </div>
      <p className="gallery-ending">
        {t("ending")}
        <span>✳</span>
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
              <button onClick={() => next(-1)} aria-label={t("previous")}>
                <ArrowLeft size={18} />
              </button>
              <span>
                {filtered.findIndex((p) => p.id === selected.id) + 1} /{" "}
                {filtered.length}
              </span>
              <button onClick={() => next(1)} aria-label={t("next")}>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
