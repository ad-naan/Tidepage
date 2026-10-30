# 上手指南

这份文档面向接下来在这个脚手架上亲手开发的人：先建立三条心智模型，然后按任务查阅 Cookbook，最后是实时多人（Socket.IO / 世界空间）的接入路线图。架构边界与决策原因见 [architecture.md](architecture.md)。

## 三条心智模型

1. **模块化单体**：所有能力都在一个 Next.js 进程里。业务按模块组织在 `src/modules/<name>/`，基础设施（数据库、缓存、HTTP、日志）统一在 `src/server/`。页面直接调用模块服务端入口，不绕自己的 HTTP API。
2. **依赖方向固定**：`app → modules/*/server → application → domain`；`infrastructure` 实现 `application` 定义的仓储接口。`shared` 不依赖任何业务，`domain` 不依赖任何框架。`npm run check:architecture` 会机器检查这些规则，改坏方向会直接挂。
3. **环境即开关**：`CONTENT_SOURCE=demo|postgres` 显式切换内容来源；`REDIS_URL` 可选，配了才有缓存；`INDEXING_ENABLED` 默认关。任何外部服务缺失都不会静默回退成假数据（demo 是显式声明，不是回退）。

## 目录速查

| 想做什么          | 去哪里                                                                       |
| ----------------- | ---------------------------------------------------------------------------- |
| 加页面 / 改路由   | `src/app/[locale]/(site)` 阅读、`(immersive)` 海岸、`(publishing)` 纯文本    |
| 加 API            | `src/app/api/v1/**/route.ts` + `src/shared/contracts/api.ts`                 |
| 加业务功能        | `src/modules/<模块>/`（domain / application / infrastructure / server / ui） |
| 改文案 / 加翻译   | `src/shared/i18n/messages/zh-CN.json` 与 `en.json` 同步加 key                |
| 加表 / 改表       | `src/modules/*/infrastructure/` 的 schema + `npm run db:generate`            |
| 用缓存            | `src/server/cache/`（`createRemember` + `invalidate`）                       |
| 抛业务错误        | `src/server/http/errors.ts` 的错误工厂                                       |
| 限流              | `src/server/http/rate-limit.ts`                                              |
| 实时广播 / PubSub | `src/server/realtime/pubsub.ts`                                              |
| 日志              | `src/server/observability/logger.ts` 的 `log()`                              |

## Cookbook

### 1. 新增或修改文案（i18n）

两个语言包文件必须同步改：`src/shared/i18n/messages/zh-CN.json` 和 `en.json`，key 结构一致。组件里用 `useTranslations("<命名空间>")`，服务端用 `getTranslations`。API 错误文案放在顶层 `apiErrors` 命名空间，key 就是错误 code（见下文错误处理）。

检查残留硬编码文案：全局搜中文字符或英文句子，确认是否应进语言包。

### 2. 新增一个页面

1. 在 `src/app/[locale]/(site)/<名称>/page.tsx` 建页面，调用模块服务端入口取数（如 `getArticles(locale)`）。
2. 文案进语言包；SEO 用 `src/server/seo/metadata.ts` 的辅助函数，canonical 基于统一 `SITE_URL`。
3. 需要进导航就改 `src/components/SiteHeader.tsx` / `CelestialNav.tsx`（文案同样走 i18n）。

### 3. 新增一个 API 接口

```ts
// src/app/api/v1/<资源>/route.ts
import { listSomething } from "@/modules/<模块>/server";
import { defineRoute, jsonData } from "@/server/http/route";
import { enforceRateLimit } from "@/server/http/rate-limit";

export const GET = defineRoute(async (request, { requestId }) => {
  await enforceRateLimit(request, "<资源>:list", 60, 60); // 可选
  const query = Object.fromEntries(new URL(request.url).searchParams);
  return jsonData(await listSomething(query), requestId);
});
```

约定：

- 成功 `{ data, meta: { requestId } }`，失败 `{ error: { code, message, details? }, meta }`——`defineRoute` 自动处理，不要手写 Response.json 错误分支。
- 输入校验用 zod schema（参考 `src/modules/content/domain/query.ts` 的有界分页写法），校验失败自动 400。
- 变更接口（POST 等）：需要登录的调用 `requirePrincipal`，Cookie 鉴权的同时调用 `requireSameOrigin(request)`。
- 返回类型加到 `src/shared/contracts/api.ts`，浏览器侧用 `src/shared/http/client.ts` 的 `apiGet` / `apiSend`。

### 4. 错误处理

业务代码只抛 `AppError`，用 `src/server/http/errors.ts` 的工厂：

```ts
import {
  notFoundError,
  conflictError,
  tooManyRequestsError,
} from "@/server/http/errors";
throw notFoundError(); // 404 NOT_FOUND
throw conflictError(); // 409 CONFLICT
throw tooManyRequestsError(30); // 429 RATE_LIMITED，details 带 retryAfterSeconds
```

新错误 code 要在两个语言包的 `apiErrors` 里补 key，否则回退到抛出时传入的 message。日志用 `log(level, "事件名", { component })`，禁止记录请求体、Cookie、SQL 和原始异常消息。

### 5. 新增 / 修改数据表

1. schema 放在对应模块的 `infrastructure/` 里，并在 `src/server/db/schema.ts` 汇总。
2. `npm run db:generate` 生成 SQL（`drizzle/`），**SQL 和快照一起提交**。
3. `npm run db:migrate` 显式执行；迁移不在应用启动或请求里自动跑。
4. 开发示例数据进 `scripts/db-seed.ts`，保持幂等、不覆盖已有行。

### 6. 使用缓存

```ts
import { getCacheStore } from "@/server/cache/redis";
import { createRemember } from "@/server/cache/remember";

const remember = createRemember(getCacheStore());
const value = await remember(
  `${source}:${locale}:<资源>:<键>`, // key 带来源与语言前缀
  ttlSeconds,
  z.array(itemSchema), // zod schema，缓存值先校验再用
  () => loadFromDatabase(),
);
```

写操作在事务提交后调用 `invalidate*(...)`；缓存失败只降级不报错。参考 `src/modules/content/server/index.ts`。

### 7. 新增一个业务模块

照抄 `content` 模块的结构：

```text
src/modules/<name>/
  domain/           实体、DTO、zod 校验；不 import 框架和数据库
  application/      用例函数 + Repository 接口定义
  infrastructure/   PostgreSQL / demo 适配器、表 schema
  server/index.ts   依赖组装与缓存包装，页面只从这里 import
  ui/               React 视图
```

边界脚本会强制：app 只能碰模块的 `server` / `domain` / `ui` 入口；跨模块不能 import 别人的 `application` / `infrastructure`。

## 实时多人路线图（Socket.IO / 世界空间）

你要做的世界空间实时互动陪伴，基建已经预留了这些件：

| 预留件           | 位置                            | 作用                                                                                   |
| ---------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| PubSub 通道      | `src/server/realtime/pubsub.ts` | 配 `REDIS_URL` 自动用 Redis 发布订阅（多实例广播），没配则进程内总线（单实例开发可用） |
| 限流器           | `src/server/http/rate-limit.ts` | 握手前 / 高频接口的 429 保护                                                           |
| 错误与 requestId | `src/server/http/`              | WebSocket 握手失败也能走统一的本地化错误管道                                           |
| 会话校验         | `src/modules/identity/server`   | `requirePrincipal` 可在握手阶段复用，Cookie 鉴权真实会话                               |
| 世界域模型       | `src/modules/world/domain`      | 航程与解锁规则已是纯函数，多人状态同步可直接复用判定                                   |

### 接入方案选型

Next.js App Router 的 Route Handler **无法挂 WebSocket 升级**，所以 Socket.IO 不能直接写在 `src/app/api` 里。两条路：

- **方案 A（推荐起步）：独立实时网关进程**
  新建 `src/modules/world/realtime/`（或独立 `realtime/` 服务目录），用 `node --import tsx` 起一个独立进程，复用 `getPubSub()`、`getEnv()`、identity 会话校验。Next 页面通过环境变量 `NEXT_PUBLIC_REALTIME_URL` 连接。优点：不动 Next 的启动链路，`next dev` 热更新不受影响；缺点：多一个进程要管（compose 里加一个 service 即可）。
- **方案 B：自定义 server**
  用 `server.ts` 自己 `const app = next({ dev }); const server = http.createServer(app);` 再挂 Socket.IO。优点：单进程；缺点：放弃 `next dev` 的部分能力（如自动 Turbopack 特性），dev 体验变差，部署脚本全要改。

单人项目先用 A，等实时逻辑稳定再评估合并。

### 世界空间同步建议（踩坑提示）

- **房间即区域**：Socket.IO room 对应世界区域（海岸 / 海湾 / 灯塔），跨区切换 = leave + join，天然隔离广播范围。
- **服务端权威 + 客户端插值**：客户端只上报意图（输入 / 位置采样 10–15Hz），服务端按 tick 广播快照或增量，客户端在两个快照间插值。不要把 Three.js 的对象直接序列化传输，传 DTO。
- **PubSub 分层**：单实例内 Socket.IO 自身的 `io.emit` 就够；**只有**多实例部署时才需要 `getPubSub()` 把事件从实例 A 广播到实例 B 的 socket。第一天不要为它增加复杂度，但通道已经就位。
- **presence 用心跳**：进房 join、掉线（`disconnect` 事件）即离场；Redis 配置后可把 presence 写进带 TTL 的 key，天然容错。
- **位置/互动事件限流**：`checkRateLimit` 可直接用于事件频率上限（如每秒最多 N 次位置上报），防止客户端刷屏。

### 最小落地顺序

1. `compose.yaml` 保持现状（Redis 已有）；`npm i socket.io socket.io-client`。
2. 方案 A：建独立网关进程入口，握手时用现有 Cookie 会话校验（未登录允许游客身份也可，看产品决策）。
3. 先做 presence（谁在线、位置广播），再叠加互动动作（打招呼、同乘），最后做持久化世界状态。
4. 事件 payload 全部走 zod 校验（放 `src/modules/world/domain`），与服务端 API 同一标准。

## 提交前检查清单

```sh
npm run check   # 架构边界 + Next 类型生成 + tsc + 测试，一条命令全查
npm run build   # 需要验证生产构建时
```

- [ ] 两个语言包 key 同步
- [ ] 新 SQL 迁移与快照一起提交
- [ ] 错误 code 进了 `apiErrors`
- [ ] 没有绕过模块入口直接 import 适配器
- [ ] 日志不含敏感信息
