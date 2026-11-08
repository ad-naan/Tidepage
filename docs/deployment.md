# 部署（Docker + 外部 PostgreSQL / Redis）

`compose.yaml` 只编排本项目自身服务：`web`（Next.js standalone）、`realtime`（Socket.IO 网关）、`nginx`（唯一公网入口）。PostgreSQL 与 Redis 使用外部已有实例，地址全部通过 `.env` 注入，不在编排内启动。

## 一、Redis 需要做的配置（外部实例侧）

实时网关对 Redis 有几条硬性要求，与普通缓存用法不同：

1. **版本 ≥ Redis 7**。跨实例广播依赖 `@socket.io/redis-streams-adapter`（Redis Streams），按 Redis 7 验证。
2. **淘汰策略必须是 `noeviction`**（`config set maxmemory-policy noeviction`）。网关的写租约、单调 revision、状态键都存 Redis；`allkeys-lru` / `volatile-*` 会在内存压力下随机驱逐这些键，导致作者状态莫名掉线、租约判断错乱。这是 `docs/realtime.md` 明确警告过的。
3. **不要与 `allkeys-lru` 缓存共用实例**（除非整个实例都改为 `noeviction` 并单独做容量规划）。推荐给实时服务一个独立实例；如果只能共用，至少用不同的 `CACHE_NAMESPACE` 前缀并确认整实例策略满足第 2 条。
4. **持久化建议开启 AOF**（`appendonly yes`，`appendfsync everysec`）。状态本身有 75 秒 TTL，但 revision 计数器丢失会引起版本回退。
5. **网络与认证**：Redis 端口只在内网开放，网关容器能访问即可，不要暴露公网。连接串支持密码与 TLS：`redis://:password@host:6379` 或 `rediss://host:6379`（网关只接受 `redis://` / `rediss://` 两种 scheme）。
6. **容量**：数据量很小（单作者状态快照 + Socket.IO streams，streams 有 `maxLen 10000` 上限），默认配置足够；无需大内存配额。
7. 若使用 Redis Cluster：键已带 hash tag（`{namespace:author}`），作者状态 Lua 原子操作天然兼容。

`.env` 中用 `REALTIME_REDIS_URL` 指向网关实例，Compose 会以同名变量传给容器。Web 使用独立的 `REDIS_URL` 作为可选缓存和限流存储。

## 二、`.env` 变量

```dotenv
# 对外域名与站点地址
TIDEPAGE_DOMAIN=example.com
SITE_URL=https://example.com

# 外部 PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/adnaan
DATABASE_POOL_MAX=10
DATABASE_CONNECT_TIMEOUT_MS=10000

# Web 侧可选缓存（可用另一个实例，允许留空）
# REDIS_URL=redis://cache-host:6379
# REDIS_CONNECT_TIMEOUT_MS=3000

# 实时网关专用 Redis（必须满足上文配置要求）
REALTIME_REDIS_URL=redis://:password@realtime-redis-host:6379

# 实时链路
REALTIME_ORIGINS=https://example.com
# 生成：node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
REALTIME_AUTHOR_TOKEN=<至少32字符随机令牌>
# 注意：该值在 Next 构建时内联进客户端，需与 REALTIME_ORIGINS 一致
NEXT_PUBLIC_REALTIME_URL=https://example.com

CACHE_NAMESPACE=tidepage:prod:v1

# 网站与后台统一 OAuth 登录（至少配置一对）
# OAUTH_GITHUB_CLIENT_ID=
# OAUTH_GITHUB_CLIENT_SECRET=
# OAUTH_GITEE_CLIENT_ID=
# OAUTH_GITEE_CLIENT_SECRET=
```

OAuth 回调地址为 `<SITE_URL>/api/v1/auth/github/callback` 或 `<SITE_URL>/api/v1/auth/gitee/callback`，开发和生产分别注册应用。在连接相同数据库的环境执行 `pnpm admin:setup --github <站主用户名> --gitee <站主用户名>`，将两种身份绑定到同一个站主。可只传一种平台，之后重复执行追加另一种。站主权限保存在数据库，无需管理员环境变量。

要点：

- `NEXT_PUBLIC_REALTIME_URL` 写域名根路径（不要带 `:3101`、不要带 `/socket.io`），浏览器经 nginx 的 `/socket.io/` 反代连网关。
- 桌面助手的服务地址填 `https://example.com`（同样不带 `/socket.io`）。
- `REALTIME_AUTHOR_TOKEN` 绝不能进 `NEXT_PUBLIC_` 前缀变量或提交仓库。

Redis URL 中的用户名和密码要分别做百分号编码，例如密码里的 `@`、`#`、`%` 分别写成 `%40`、`%23`、`%25`，不要编码整个连接串。在 `.env` 中用引号包住完整值，避免 `#` 被当作注释；Web 的 `REDIS_URL` 和网关的 `REALTIME_REDIS_URL` 都需要检查。修改后重启对应服务，再确认 Web `/api/v1/health/ready` 的 `redis` 为 `ready`、网关 `/healthz` 正常。配置存在不代表认证已通过。

远程 PostgreSQL 建连等待由 `DATABASE_CONNECT_TIMEOUT_MS` 控制，默认 10000 毫秒，范围 1000–30000。连接启用 TCP keepalive；SQL 执行仍受原有 5 秒 statement timeout 和 6 秒 query timeout 约束。Web Redis 建连等待由 `REDIS_CONNECT_TIMEOUT_MS` 控制，默认 3000 毫秒，范围 500–10000，命令等待仍为 2 秒。调长建连等待可以容纳网络抖动，不能替代排查数据库网络、容量或连接泄漏。

## 三、nginx 说明

配置模板在 `nginx/tidepage.conf.template`（官方镜像入口点自动替换 `${TIDEPAGE_DOMAIN}`）。证书放在 `nginx/certs/fullchain.pem` 与 `privkey.pem`。

关键约束（改动前先读 `docs/realtime.md`）：

- `/socket.io/` 必须支持 WebSocket Upgrade；网关只接受 WebSocket，无 polling 回退。
- `proxy_read_timeout` 必须大于 75 秒（presence TTL），当前为 120s。
- 网关在反代后只能看到 nginx 的 TCP 地址，握手限流按 nginx IP 聚合，因此入口层用 `limit_req` 按真实 IP 限流。
- 3101 端口只在 compose 内部网络暴露（`expose`，不是 `ports`），公网唯一入口是 nginx 的 80/443。

## 四、启动与验证

```sh
# 数据库迁移（首次或升级 schema 时）
pnpm db:migrate

# 构建并启动
docker compose up -d --build

# 验证
curl -f https://<域名>/            # Next 应用
curl -f https://<域名>/socket.io/  # 应返回 0 字节 200（Engine.IO 探测由 WebSocket 完成）
docker compose ps                   # realtime 应为 healthy
docker compose logs realtime nginx
```

健康检查：网关容器内 `GET /healthz`（Redis 不可用时返回 503 并停止接受需要 Redis 的更新）。

Web 的 `/api/v1/health/live` 检查进程，`/api/v1/health/ready` 检查 PostgreSQL 和可选的 Web Redis。只有 Redis 故障时返回 HTTP 200 和 `degraded`，网站可继续读数据库。PostgreSQL 不可用时返回 503。Compose 启用可信客户端 IP，nginx 会覆盖 `X-Real-IP`。其他部署只有在 Web 监听口受保护且入口覆盖此请求头时才启用 `TRUST_PROXY_CLIENT_IP`。

启动新版 Web 前先执行 `pnpm db:migrate`，并用 `pnpm db:check` 确认迁移完成。文章读取和发布都依赖 `0009` 新增的表结构。

代码修改后重新部署：`NEXT_PUBLIC_REALTIME_URL` 是构建期内联变量，修改后必须 `docker compose up -d --build` 重建 web 镜像，仅重启容器不生效。
