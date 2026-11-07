/** Public author identity. Visible editorial copy lives in the locale catalogs. */
export const profile = {
  name: "adnaan",
  avatar: "/images/author-avatar.png",
  github: "https://github.com/ad-naan",
} as const;

/** Verified public destinations; adding another profile never changes the hero layout code. */
export const profileLinks = [
  { key: "github", href: profile.github },
  { key: "gitee", href: "https://gitee.com/adnaan" },
  { key: "spark", href: "https://spark-relics.github.io/" },
] as const;
