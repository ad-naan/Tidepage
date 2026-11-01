# Tidepage · 潮页

adnaan 的手绘博客与可探索海岸，使用 Next.js、React、TypeScript 和 Three.js。页面和后端在同一个项目中。

**第一次开发，先看 [开发上手](docs/onboarding.md)。找不到文件，查 [按任务找文件](docs/project-map.md)。** 不需要先读完数据库和所有架构说明。

## 先跑起来

需要 Node.js 24。在项目根目录打开终端：

```powershell
npm ci
npm run dev
```

打开终端显示的地址，通常是 [中文首页](http://localhost:3000/zh-CN) 或 [英文首页](http://localhost:3000/en)。默认 demo 模式不需要 Docker、PostgreSQL 或 Redis。若已有环境文件设置了 `CONTENT_SOURCE=postgres`，先看上手指南的数据库章节。

以后日常开发只运行 `npm run dev`，保存文件后自动更新；按 `Ctrl+C` 停止。不要同时开多个开发服务。

## 我要改哪里

| 要改的东西                         | 文件位置                                                        |
| ---------------------------------- | --------------------------------------------------------------- |
| 介绍、标题、按钮等界面文字         | `src/shared/i18n/messages/zh-CN.json`、`en.json`                |
| 首页布局、介绍区                   | `src/modules/home/ui/HomeView.tsx`、`HomeHero.tsx`              |
| 页头、菜单、页脚                   | `src/widgets/site-shell/`                                       |
| 文章、手记、项目、一言、照片、自述 | `src/modules/content/ui/` 下对应目录                            |
| 姓名、头像路径、GitHub 等外链      | `src/shared/config/profile.ts`                                  |
| 基础按钮、输入、弹窗、筛选、提示   | `src/shared/ui/`                                                |
| 字体、字号、间距                   | `src/styles/tokens.css`                                         |
| 演示文章等内容                     | `src/modules/content/infrastructure/demo-data.ts`、`demo-en.ts` |
| 海岸插画、三维漫游                 | `src/modules/world/ui/`、`runtime/`                             |

旧 `src/components` 已按职责拆分，不再使用。页面样式通常就在对应组件旁边的 `.module.css` 中。完整路径见 [目录说明](docs/project-map.md)。

## 开发最常用的命令

```powershell
npm run dev       # 开发和热更新
npm run format    # 统一格式化代码、样式、配置和文档
npm run format:check # 只检查格式，不修改文件
npm run check     # 格式、架构、类型、自动测试
npm run build     # 确认可构建生产版本
```

格式使用 Prettier，规则统一在 `.prettierrc.json`：2 空格缩进、双引号、分号、80 列换行参考宽度和 LF 换行。`.editorconfig` 同步基础编辑规则；使用 VS Code 时安装工作区推荐的 Prettier 扩展，保存即可自动格式化。生成文件、缓存、静态资源和锁文件通过 `.prettierignore` 排除。CI 的 `npm run check` 包含格式检查，提示格式问题时先执行 `npm run format`。

基础控件用现成的 `Button`、`Input`、`FilterTabs`、`Dialog` 等；文案使用语言包。可复制的例子见 [开发上手](docs/onboarding.md)。

## 文档怎么读

1. [开发上手](docs/onboarding.md)：启动、改文字、改样式、新增页面、接数据库。
2. [按任务找文件](docs/project-map.md)：目录用途、真实文件位置、旧名称对应新名称。
3. [前端架构与组件清单](docs/frontend-architecture.md)：组件放哪、怎样命名、公共控件怎么用。
4. [设计基础](docs/design-system.md)：字体、间距、笔触和动效标准。
5. [后端开发](docs/backend-development.md)：需要 API、PG、Redis、多人网关时再看。
6. [系统架构](docs/architecture.md)：数据来源、发布、缓存、SEO / GEO。

全部文档入口是 [docs/README.md](docs/README.md)。

## 当前功能范围

文章、手记、项目、一言已有 demo 与 PostgreSQL 两种来源；数据库接入按上手指南操作。HTTP 接口在 `/api/v1`，存活检查为 `/api/v1/health/live`。

标明“演示”的登录、评论、点赞和人数仍是界面预览。真实 OAuth、内容管理后台、对象存储、Agent 服务尚未实现。照片和音乐导入使用浏览器临时地址，海岸进度保存在当前浏览器。

开发默认关闭索引；正式发布前配置真实 `SITE_URL`、数据库内容和 `INDEXING_ENABLED`。素材来源见 [ASSETS.md](ASSETS.md)。
