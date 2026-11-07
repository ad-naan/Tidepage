# 项目架构

## 从网址找到文件

Next.js App Router 根据 `src/app/` 的目录生成网址。`page.tsx` 渲染页面，`layout.tsx` 包住同目录及子页面，`loading.tsx` 提供等待界面，`route.ts` 处理 HTTP 方法。`[locale]` 和 `[slug]` 是网址里的变量，`(site)` 和 `(admin)` 是代码分组。

| 网址                        | Next.js 入口                                       | 页面内容或服务                                   |
| --------------------------- | -------------------------------------------------- | ------------------------------------------------ |
| `/zh-CN`                    | `app/[locale]/(site)/page.tsx`                     | `modules/home/ui/HomeView.tsx`                   |
| `/zh-CN/articles`           | `app/[locale]/(site)/articles/page.tsx`            | `modules/content/ui/articles/ArticlesView.tsx`   |
| `/zh-CN/articles/post-31`   | `app/[locale]/(site)/articles/[slug]/page.tsx`     | `modules/content/ui/articles/ArticleDetail.tsx`  |
| `/zh-CN/admin/articles/new` | `app/[locale]/(admin)/admin/articles/new/page.tsx` | `modules/content/ui/admin/ArticleEditorView.tsx` |
| `/zh-CN/explore`            | `app/[locale]/(immersive)/explore/page.tsx`        | `modules/world/ui/CoastalExperience.tsx`         |
| `/api/v1/articles`          | `app/api/v1/articles/route.ts`                     | `modules/content/server/`                        |

表中路径从 `src/` 开始。站点布局挂载页头和页脚，工作台与海岸各用自己的布局。根布局挂载全局字体与样式，语言布局校验语言并装载文案。

## 每个目录负责什么

```text
src/
  app/                  路由、页面布局、HTTP 入口和 SEO
  widgets/              组合页面外壳，如公共页头和工作台导航
  modules/              按业务拆分，如 content、identity、engagement
    content/
      domain/           内容类型、字段校验、发布规则
      application/      查询用例和仓储接口
      infrastructure/   PostgreSQL 查询和表定义
      server/           服务端公开入口和发布命令
      ui/               阅读、列表、搜索和编辑器
  shared/               基础组件、文案、通用协议和工具
  server/               数据库连接、缓存、HTTP、日志和 SEO 基础设施
services/realtime/      独立 Socket.IO 网关
desktop/                Go 桌面助手
drizzle/                数据库迁移 SQL 与快照
tests/                  业务测试、数据库查询测试与边界检查
```

页面先从 `app` 找入口，改外观再进入 `modules/<功能>/ui`。业务模块使用共享工具，`shared` 不依赖业务。纯校验进 `domain`，数据库查询进 `infrastructure`，跨业务的服务端调用使用模块的 `server` 入口。

默认页面和视图可以在服务端渲染。需要点击状态、浏览器 API 或编辑器的组件才标记 `"use client"`。服务端直接调用业务读取函数。浏览器通过 `shared/http/client.ts` 调用 `/api/v1`。数据库、密钥和服务端模块通过 `server-only` 隔离。

## 跟一遍文章请求

1. **读文章**。详情 `page.tsx` 从 URL 取语言和 slug，调用 `content/server/index.ts`。服务优先使用缓存，未命中时由 `postgres-repository.ts` 查询已到发布时间的文章。页面把正文交给 `ArticleDetail`，页头从当前阅读视图取得标题。
2. **保存草稿**。编辑器调用 `/api/v1/workbench/articles` 保存工作副本。后端按账号和记录组保存，使用 revision 检查过期写入。
3. **发布**。编辑器向 `POST /api/v1/articles` 提交草稿 ID、语言和 revision。接口检查同源、角色和限流，发布命令锁定工作副本并校验正文与资源归属，再写入公开文章。事务提交后清理摘要、列表与详情缓存。已发布的 URL 保持稳定。

页面、RSS、sitemap、Markdown 和 `llms.txt` 共享发布规则。公开网址从 `SITE_URL` 生成，界面用注册词典，内容翻译由数据库按 locale 隔离。

## 速度与并发在哪里控制

- 公共页头只取少量文章摘要、最近手记和项目预览。文章详情用有界查询找下一篇。评论和互动校验只查请求中的 ID。归档用一条 SQL 获取分页和总数，二者使用同一个数据库快照。
- `server/cache/` 负责 Redis 和同进程并发请求合并。缓存命名空间和 TTL 可配置，Redis 失败时回源 PostgreSQL。定时发布内容的缓存可延迟到 TTL 更新。
- `server/db/client.ts` 创建连接池。扩容时用数据库总连接预算计算各 Web 实例的 `DATABASE_POOL_MAX`，同时给迁移和运维连接留空间。
- `server/http/rate-limit.ts` 用 Redis 原子计数共享限流。登录后的写入按账号计数，匿名操作按可信入口 IP 计数。Redis 不可用时使用有容量上限的本地计数，额度按实例分开。
- Web 网页和 HTTP API 走 Next.js，长连接由 `services/realtime/` 处理。部署拓扑和核查命令见 [部署](deployment.md)。

修改表定义后生成并提交 SQL 与快照。先用 `pnpm run db:check` 查看目标数据库，再执行 `pnpm run db:migrate`。开发中的 SQL 测试用 PGlite 执行仓库迁移，生产吞吐和延迟需在目标 PostgreSQL、Redis 和反代上测量。
