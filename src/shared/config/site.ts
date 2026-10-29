export const site = {
  name: "adnaan · 光阴副本",
  author: "adnaan",
  language: "zh-CN",
  description:
    "adnaan 的光阴副本。记录技术、产品与生活，把这一页留好，下一页继续。",
} as const;
export const publicPages = [
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
