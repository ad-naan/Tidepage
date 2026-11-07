export const site = {
  name: "光阴副本集",
  title: "光阴副本集 · adnaan",
  timeZone: "Asia/Shanghai",
  description:
    "把经历写成文字，把想法做成作品。这里收藏 adnaan 关于技术、设计与日常的光阴副本。",
} as const;
export const navigationItems = [
  { href: "/", key: "home" },
  { href: "/articles", key: "articles" },
  { href: "/notes", key: "notes" },
  { href: "/projects", key: "projects" },
  { href: "/quotes", key: "quotes" },
  { href: "/gallery", key: "gallery" },
  { href: "/about", key: "about" },
  { href: "/site", key: "site" },
  { href: "/friends", key: "friends" },
] as const;
