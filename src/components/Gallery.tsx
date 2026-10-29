"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
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
type Photo = {
  id: string;
  src: string;
  title: string;
  caption: string;
  place: string;
  category: string;
  ratio: string;
  position?: string;
};
const photos: Photo[] = [
  {
    id: "sea",
    src: "/images/coast.png",
    title: "海风替我写了一封信",
    caption: "什么都不做，只是看着海，时间也会变得柔软。",
    place: "海边",
    category: "在路上",
    ratio: "3/4",
  },
  {
    id: "coffee",
    src: "/images/window.png",
    title: "把下午留给一杯咖啡",
    caption: "光落在纸上，是今天最温柔的事情。",
    place: "窗边咖啡馆",
    category: "日常",
    ratio: "4/5",
  },
  {
    id: "meadow",
    src: "/images/meadow.png",
    title: "走进一片不着急的绿",
    caption: "草木不说话，却把很多事情告诉了我。",
    place: "山野之间",
    category: "自然",
    ratio: "4/3",
  },
  {
    id: "light",
    src: "/images/window.png",
    title: "光的形状",
    caption: "同一个午后，换一个角度看光。",
    place: "窗边 · 局部",
    category: "日常",
    ratio: "1/1",
    position: "50% 18%",
  },
  {
    id: "flowers",
    src: "/images/meadow.png",
    title: "把风装进口袋",
    caption: "沿途的野花，都是不期而遇的礼物。",
    place: "草地 · 局部",
    category: "自然",
    ratio: "3/4",
    position: "20% 80%",
  },
  {
    id: "horizon",
    src: "/images/coast.png",
    title: "远处，还是远处",
    caption: "看过海的人，总会在心里留一片蓝。",
    place: "海岸 · 局部",
    category: "在路上",
    ratio: "4/3",
    position: "50% 30%",
  },
];
export function Gallery() {
  const [items, setItems] = useState(photos);
  const [filter, setFilter] = useState("全部");
  const [selected, setSelected] = useState<Photo | null>(null);
  const [liked, setLiked] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const localUrls = useRef<string[]>([]);
  useEffect(
    () => () => localUrls.current.forEach((u) => URL.revokeObjectURL(u)),
    [],
  );
  const filtered = items.filter(
    (p) => filter === "全部" || p.category === filter,
  );
  function next(n: number) {
    if (!selected) return;
    const i = filtered.findIndex((p) => p.id === selected.id);
    setSelected(filtered[(i + n + filtered.length) % filtered.length]);
  }
  return (
    <div className="inner-page gallery-page">
      <PageHeading
        title="这一刻，值得留下"
        description="给走过的光阴留一张底片。再看见时，也能想起当时的自己。"
      />
      <div className="gallery-toolbar">
        <div className="tabs">
          {["全部", "日常", "自然", "在路上"].map((c) => (
            <button
              key={c}
              className={filter === c ? "selected" : ""}
              onClick={() => setFilter(c)}
            >
              {c}
              {filter === c && (
                <motion.span layoutId="gallery-tab" className="tab-underline" />
              )}
            </button>
          ))}
        </div>
        <label className="gallery-upload">
          <Upload size={13} />
          <span>添加照片</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            aria-label="添加本地照片"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              const newPhotos: Photo[] = [];
              for (const file of files) {
                if (file.size > 15 * 1024 * 1024) {
                  setNotice("请选择小于 15 MB 的图片。");
                  continue;
                }
                const src = URL.createObjectURL(file);
                localUrls.current.push(src);
                newPhotos.push({
                  id: src,
                  src,
                  title: file.name.replace(/\.[^.]+$/, ""),
                  caption: "刚刚留下的一片光。",
                  place: "我的相片",
                  category: "日常",
                  ratio: "3/4",
                });
              }
              setItems((v) => [...newPhotos, ...v]);
              setFilter("全部");
              if (newPhotos.length)
                setNotice("照片只在本次浏览中展示，不会上传。");
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <div className="gallery-meta">
        <span>
          <Camera size={13} />
          {filtered.length} 个被收藏的瞬间
        </span>
        <span>生成摄影素材 · 样式预览</span>
      </div>
      {notice && (
        <div className="gallery-notice" role="status">
          {notice}
          <button aria-label="关闭提示" onClick={() => setNotice("")}>
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
                    ? `取消喜欢 ${photo.title}`
                    : `喜欢 ${photo.title}`
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
        把瞬间留下，让生活继续。<span>✳</span>
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
              <button onClick={() => next(-1)} aria-label="上一张照片">
                <ArrowLeft size={18} />
              </button>
              <span>
                {filtered.findIndex((p) => p.id === selected.id) + 1} /{" "}
                {filtered.length}
              </span>
              <button onClick={() => next(1)} aria-label="下一张照片">
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
