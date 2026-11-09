/** The small, business-independent payload used by every external link. */
export type LinkPreview = {
  kind?: "web" | "movie" | "music";
  title?: string;
  description?: string;
  siteName?: string;
  artworkUrl?: string;
  artworkAlt?: string;
  creator?: string;
  album?: string;
  year?: string;
};
