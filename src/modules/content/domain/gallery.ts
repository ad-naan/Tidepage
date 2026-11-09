import { z } from "zod";
import type { PhotoCapture } from "@/modules/media/domain/photo-capture";

export const galleryCategories = ["daily", "nature", "travel"] as const;
export const galleryCategorySchema = z.enum(galleryCategories);

export type GalleryPhoto = {
  id: string;
  src: string;
  title: string;
  caption: string;
  alt: string;
  place: string;
  category: (typeof galleryCategories)[number];
  width: number;
  height: number;
  capture: PhotoCapture | null;
};
