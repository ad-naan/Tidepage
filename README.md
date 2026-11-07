# Tidepage · 潮页

adnaan 的双语博客、内容工作台与可探索海岸。Next.js 同时负责网站页面和 HTTP API，PostgreSQL 保存内容和账号，Socket.IO 网关负责实时功能。

## 本地启动

使用 Node.js 24 和 pnpm 12.16.1。第一次安装 pnpm 可运行 `npm install --global pnpm@12.16.1`。缺少环境文件时从 `.env.example` 复制配置，并把 `DATABASE_URL` 指向开发库。已有环境文件可直接沿用。

本地用根目录一个 `.env` 即可。`.env.local` 可作为个人覆盖。站点用 `SITE_`、数据库用 `DATABASE_`、OAuth 用 `OAUTH_`、模型用 `AI_`、网关用 `REALTIME_`。只有浏览器要读的公开值才加 `NEXT_PUBLIC_`。

```powershell
pnpm install --frozen-lockfile
pnpm run db:check
# 确认目标是开发库后，应用待执行的迁移
pnpm run db:migrate
pnpm run dev
```

打开终端显示的地址，通常是 [中文首页](http://localhost:3000/zh-CN)、[英文首页](http://localhost:3000/en) 或 [工作台](http://localhost:3000/zh-CN/admin)。日常启动只需 `pnpm run dev`。要联调在线状态和多人海岸，另开终端启动网关。 [实时服务](docs/realtime.md)

## 改哪里

| 要做的事                          | 入口                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 看懂 Next.js 路由、目录和请求流程 | [项目架构](docs/architecture.md)                                                                       |
| 改中文、英文文案                  | `src/shared/i18n/messages/`                                                                            |
| 改首页、文章、工作台或海岸        | 对应的 `src/modules/<功能>/ui/`，样式在组件旁的 `.module.css`                                          |
| 改页头、菜单和页脚                | `src/widgets/site-shell/`                                                                              |
| 改头像和个人外链                  | `src/shared/config/profile.ts`                                                                         |
| 新增组件、改公共样式              | [前端架构](docs/frontend-architecture.md)、[设计基础](docs/design-system.md)                           |
| 绑定站主、管理草稿和媒体          | [工作台](docs/workbench-development.md)                                                                |
| 上线或排查服务                    | [部署](docs/deployment.md)、[实时服务](docs/realtime.md)、[旧数据迁移](docs/legacy-mysql-migration.md) |

提交前运行 `pnpm run check` 和 `pnpm run build`。前者包含格式、依赖边界、类型和自动测试，后者验证生产构建。

## 当前功能

文章、手记、项目和一言从 PostgreSQL 读取。工作台通过 GitHub 或 Gitee 登录，保存双语草稿，支持按语言发布文章和手记。读者评论、点赞和收藏持久化到数据库。上传图片保存在 `UPLOAD_DIR`。

项目、一言、照片和友联仍有公开发布环节待接通。写作助手在配置模型后支持编辑、生成文章元数据、翻译和站点 SEO/GEO/RSS 审阅。实时作者状态和多人海岸依赖独立网关。 [工作台](docs/workbench-development.md)
