export const site = {
  name: "光阴副本集",
  title: "光阴副本集 · adnaan",
  author: "adnaan",
  language: "zh-CN",
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
  { href: "/friends", key: "friends" },
] as const;
export const publicPages = [
  {
    path: "/friends",
    title: "友联",
    description: "沿岸的朋友，在各自的小岛听见彼此的潮声。",
  },
  { path: "/", title: "首页", description: site.description },
  {
    path: "/articles",
    title: "文章",
    description: "关于技术、产品与生活的文章与思考。",
  },
  {
    path: "/notes",
    title: "手记",
    description: "日常片段、开发手记和还在生长的念头。",
  },
  {
    path: "/projects",
    title: "项目",
    description: "独立开发、产品与交互实验。",
  },
  { path: "/quotes", title: "一言", description: "留给下一页的话。" },
  { path: "/gallery", title: "照片廊", description: "记录沿途的风景与日常。" },
  {
    path: "/about",
    title: "自述",
    description: "关于 adnaan 和这份光阴副本。",
  },
] as const;
