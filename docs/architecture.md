# 项目架构与模块约定

项目采用 Next.js App Router 全栈模块化单体。页面、版本化 HTTP API、RSS、SEO 和面向 AI 的正文输出使用同一个内容服务。PostgreSQL 保存业务事实，Redis 只做可丢弃的缓存。当前无需独立部署第二个后端进程；未来若拆分服务，迁移模块的应用层与仓储适配器即可。

## 目录与依赖方向

```text
src/
  app/                         路由、布局和请求适配，不编写业务查询
    (site)/                    阅读站点，共享 Shell；URL 不带分组名称
      articles/[slug]/
      notes/ projects/ quotes/ gallery/ about/
    (immersive)/explore/       海岸世界，不加载阅读站点布局或身份预览
    (publishing)/              正文文本输出，不加载页面布局
      articles/[slug]/text/
    api/v1/                    有版本的 JSON 接口
    feed.xml/ llms.txt/        与页面同源的机器可读输出
    sitemap.ts robots.ts      索引控制
  modules/
    content/
      domain/                  实体、DTO、校验规则，不依赖数据库或框架
      application/             用例、仓储接口、正文序列化
      infrastructure/          PostgreSQL 与明确的 demo 适配器、表结构
      server/index.ts          服务端公开入口和依赖组装
      ui/                      文章、手记、项目、一言的前端视图
    identity/
      domain/                  真实账号与角色类型
      infrastructure/          users、sessions 表
      server/                  数据库会话读取和角色校验
      ui/                      现有身份预览，不能作为真实鉴权依据
    engagement/ui/             现有评论、回应演示
    world/
      domain/                  航程、解锁规则和导航算法
      runtime/                 Three.js、环境、音频与资源生命周期
      ui/                      React HUD 和世界入口
  server/
    config/                    服务端环境校验
    db/                        PG 连接池、Drizzle 客户端和 schema 汇总
    cache/                     Redis 适配器、缓存接口、合并并发读取
    http/                      错误、响应、请求包装、同源校验
    observability/             结构化运行日志
    seo/                       canonical、Open Graph、JSON-LD
  shared/
    config/                    非敏感站点信息、个人文案
    contracts/                 可在浏览器使用的 API 与分页类型
    http/                      浏览器请求客户端
    hooks/ ui/ lib/            无业务依赖的基础组件与工具
  components/                  跨页面的站点布局和原创插画
  styles/                      现有全局视觉系统
drizzle/                       可审阅的 SQL 迁移与快照
scripts/                       迁移、种子、边界检查与开发工具
tests/platform/                配置、HTTP、缓存和真实 PG 查询语义测试
```

依赖方向为路由 → 模块服务端入口 → 应用服务 → 仓储接口。基础设施实现仓储接口，由模块入口选择。客户端只接收可序列化 DTO 或调用 `/api/v1`，服务端页面直接调用服务，避免先经过自己的 HTTP API。

`shared` 不依赖业务模块。`domain` 不依赖应用层、UI 或数据库；`application` 不依赖适配器。跨模块使用公开的 `server`、`domain` 或 UI 入口。服务端代码标记 `server-only`。`npm run check:architecture` 检查这些规则，并沿客户端导入链检查是否带入服务端代码。

## 内容与发布

`ContentRepository` 是内容查询契约，`createContentService` 负责输入规则。`CONTENT_SOURCE=demo` 使用隔离在内容模块基础设施中的示例；`CONTENT_SOURCE=postgres` 使用真实数据库。两者切换需要重启服务。PostgreSQL 模式绝不因连接失败而回退示例。

文章、手记、项目和一言都只有 `visibility=published` 且 `published_at` 不晚于当前时间时可见。文章列表只查询摘要列，详情才查询正文。搜索通过绑定参数执行，分页有上限，结果使用发布日期与 slug 稳定排序；总数和结果在同一个只读事务快照中读取。

新增写入用例时，在模块应用层实现命令，基础设施用事务落库；事务成功后失效缓存。不要在 Route Handler、React 组件或 SEO 文件中重复 SQL。当前公开接口仅提供读取，作者后台和内容编辑接口尚未实现。

## 数据库与缓存生命周期

PG 连接池惰性创建并在开发热更新中复用，设有连接、查询和空闲超时。生产 SSL 由部署环境提供的 `DATABASE_URL` 指定，代码不关闭证书验证。数据库迁移是独立发布步骤，不在页面请求或应用启动时自动执行。

`db:generate` 从模块 schema 生成 SQL，`db:migrate` 执行已提交迁移。提交 schema 修改时同时提交 SQL 与快照。`db:seed` 只导入开发示例、使用事务、重复运行不覆盖已有内容，且禁止在 production 环境运行。生产内容通过后续编辑业务录入。

Redis 无配置时不启用缓存，不自动启动进程内缓存。文章摘要集合和详情使用 cache-aside，包含环境命名空间、内容来源与 TTL；缓存值先校验，并合并同一进程的并发未命中。Redis 出错时继续读取数据源，源数据错误向上传递。手记、项目、一言和搜索目前直接查询，避免过早缓存任意组合条件。

发布、编辑或下架文章后调用 `invalidateContentCache(slug)`。失效失败时写入本身仍然已经提交，最多在 TTL 内保留旧缓存；后续写接口应记录失效失败，必要时使用事务外盒重试。多实例共享 Redis，生产连接池大小要按实例数和数据库总连接预算配置。

## HTTP 与身份边界

`defineRoute` 统一生成请求编号，成功返回 `{ data, meta: { requestId } }`，失败返回 `{ error: { code, message, details? }, meta }`。校验失败为 400、未登录 401、无权限 403、缺失内容 404、内部错误 500。内部异常不向客户端输出连接串或堆栈。日志不记录请求正文、Cookie、SQL 和原始异常消息。

| 接口                         | 用途                                               |
| ---------------------------- | -------------------------------------------------- |
| `GET /api/v1/articles`       | q、category、page、pageSize 查询，pageSize 最大 50 |
| `GET /api/v1/articles/:slug` | 已发布正文                                         |
| `GET /api/v1/notes`          | 已发布手记                                         |
| `GET /api/v1/projects`       | 已发布作品                                         |
| `GET /api/v1/quotes`         | 已发布一言                                         |
| `GET /api/v1/session`        | 真实数据库会话；无会话返回 401                     |
| `GET /api/v1/health/live`    | 进程存活                                           |
| `GET /api/v1/health/ready`   | 配置的 PG / Redis 可用性，失败返回 503             |

真实会话只读取 `adnaan_session` 中的随机不透明 token，在数据库存 SHA-256 摘要，并检查有效期、用户和角色。当前没有 token 签发入口，也没有 OAuth 流程。后续登录模块必须设置 HttpOnly、Secure、SameSite Cookie，并实现轮换与注销；需要权限的服务端用例调用 `requirePrincipal`，Cookie 鉴权的修改接口同时调用 `requireSameOrigin`。角色检查不能只做在前端或布局里。

身份预览、评论、点赞、照片与音乐临时导入、世界存档依然是原有本地体验，没有伪装成真实持久化功能。接入这些模块时分别定义其领域、应用服务、持久化和鉴权，不借用页面组件中的演示状态。

## SEO 与 GEO

`SITE_URL` 是 canonical、RSS、sitemap、JSON-LD 和文本引用的唯一域名来源，不使用请求 Host 推断公开地址。每个阅读页设置自己的 canonical。文章发布和更新时间来自内容记录；JSON-LD 包含真实可见文章信息与面包屑，并转义 `<`，防止正文关闭脚本标签。

默认 `INDEXING_ENABLED=false`，站点输出 noindex、robots 禁止抓取和空 sitemap。改为 true 前，需要 HTTPS 正式域名、PostgreSQL 模式和实际发布内容。互动海岸持续 noindex，阅读页面承担可索引内容。robots 不是访问控制，私有业务仍必须逐请求鉴权。

GEO 采用可抓取 HTML、清晰作者、稳定引用、同源 Markdown 正文和 `llms.txt` 索引。文本版指向 HTML 原文 canonical，不制作另一套事实。`llms.txt` 是面向 AI 工具的补充发现入口，不能保证 AI 引用、收录或排名；结构化数据也必须与页面一致。

参考：[Google AI 搜索指南](https://developers.google.com/search/docs/appearance/ai-features)、[Drizzle 迁移](https://orm.drizzle.team/docs/migrations)、[ioredis 连接选项](https://redis.github.io/ioredis/interfaces/CommonRedisOptions.html)。

## 后续扩展

作者后台可以添加 `(admin)/admin` 分组，但在有真实登录与权限用例前不开放写入路由。身份模块接 OAuth，互动模块接评论与收藏存储，媒体模块接对象存储。Agent 独立成业务模块，通过校验后的世界动作接口交互；凭据、模型调用与长期记忆放在服务端，不进入 Three.js 或浏览器配置。

CI 执行架构检查、类型检查、规则与查询测试、生产构建。PG 查询测试使用运行真实 PostgreSQL 引擎的 PGlite，并执行仓库中的初始 SQL；它不替代部署前对 TCP 连接池、Redis、TLS 和目标 PostgreSQL 服务的联调。
