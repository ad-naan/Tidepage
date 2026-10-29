# adnaan · 光阴副本

手绘博客与可探索海岸，基于 Next.js App Router、React、TypeScript、Three.js。后端采用模块化单体，已封装 PostgreSQL、Redis、内容服务、版本化 API、会话读取与 SEO / GEO 输出。

## 本地启动

使用 Node.js 24。

```sh
npm ci
npm run dev
```

默认 http://localhost:3000。无外部服务时使用明确的 `CONTENT_SOURCE=demo`，可以查看现有页面与互动海岸。作者文案在 `src/shared/config/profile.ts`，开发示例内容在 `src/modules/content/infrastructure/demo-data.ts`。

## 接入 PostgreSQL 与 Redis

1. 将 `.env.example` 复制为 `.env`，设置本地 `POSTGRES_PASSWORD`。Docker Compose 读取 `.env`，Next 与数据库脚本同时支持 `.env.local` 覆盖。
2. 启动 Docker Desktop，然后执行 `npm run infra:up`。数据库端口只绑定 localhost，数据使用命名卷。
3. 在 `.env` 中启用匹配密码的 `DATABASE_URL`；需要缓存时启用 `REDIS_URL`。
4. 执行迁移，可选导入开发内容。

```sh
npm run db:migrate
npm run db:seed
```

5. 设置 `CONTENT_SOURCE=postgres`，重新启动开发服务。迁移不会自动执行；PG 故障不会回退示例内容。

`npm run infra:down` 停止服务并保留数据卷。生产数据库应使用受管理的凭据、TLS 和独立迁移步骤，不直接照搬本地 Compose。

## 目录入口

| 目录                   | 责任                                          |
| ---------------------- | --------------------------------------------- |
| `src/app/(site)`       | 文章、手记、项目等阅读页面与布局              |
| `src/app/(immersive)`  | 独立的海岸体验布局                            |
| `src/app/(publishing)` | 便于引用的正文文本输出                        |
| `src/app/api/v1`       | 版本化 HTTP 请求适配                          |
| `src/modules`          | content、identity、engagement、world 业务模块 |
| `src/server`           | 配置、PG、Redis、HTTP、日志、SEO 基础设施     |
| `src/shared`           | 基础组件、hooks、DTO、浏览器请求客户端        |
| `src/components`       | 站点布局、播放器与原创插画                    |
| `drizzle`              | SQL 迁移与结构快照                            |
| `docs/architecture.md` | 模块边界、发布规则、会话、缓存与扩展约定      |

完整说明见 [架构文档](docs/architecture.md)，互动海岸说明见 [交互设计](docs/interaction-design.md)。

## 常用命令

```sh
npm run check                 # 架构边界 + Next 类型生成 + TS + 测试
npm run build                 # 生产构建
npm start                     # 运行生产构建
npm run db:generate           # 修改 schema 后生成 SQL
npm run db:migrate            # 显式迁移目标数据库
npm run db:seed               # 幂等导入开发示例，不覆盖现有行
npm run db:studio             # 本地数据库查看工具
npm run format                # 统一格式
```

`GET /api/v1/articles?page=1&pageSize=12&q=AI` 返回分页摘要；详情使用 `/api/v1/articles/:slug`。API 返回请求编号，支持统一校验与错误响应。存活和就绪探针分别为 `/api/v1/health/live` 与 `/api/v1/health/ready`。

## SEO 与 GEO

统一配置 `SITE_URL`。支持 canonical、Open Graph 分享图、Twitter Card、作者与文章 JSON-LD、面包屑、RSS、sitemap、robots、`llms.txt` 与 `/articles/:slug/text` Markdown 引用。

开发与预览默认不开放索引。使用正式 HTTPS 域名和 PostgreSQL 内容后，显式设置 `INDEXING_ENABLED=true` 再部署。GEO 输出帮助内容被读取与引用，不保证搜索或 AI 排名。

## 当前业务范围

文章、手记、项目和一言已具备真实 PG 查询适配器；演示账号、评论与点赞仍保留明确的本地预览行为。真实会话读取和权限校验已具备，OAuth、后台编辑、对象存储与 Agent 服务尚未实现。照片和音乐导入仍使用浏览器临时 URL；海岸进度保存在当前浏览器。

海岸支持驾船、线索收集、灯塔解锁、隐藏海湾、日夜、水面反射和声音。页面保留原有手绘视觉与动效。素材说明见 [ASSETS.md](ASSETS.md)。
