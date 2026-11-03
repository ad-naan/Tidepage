# 实时连接与桌面助手

实时服务位于 `services/realtime`，独立于 Next.js 运行。Next Route Handler 不挂 WebSocket。当前交付的是作者状态链路；访客、三维空间与 agent 的业务事件、权限和存储尚未实现，不应当作已有能力调用。

## 本地联调

在 `.env` 中加入：

```dotenv
REALTIME_HOST=127.0.0.1
REALTIME_PORT=3101
REALTIME_ORIGINS=http://localhost:3000
REALTIME_AUTHOR_TOKEN=替换为至少32字符的随机令牌
NEXT_PUBLIC_REALTIME_URL=http://localhost:3101
```

生成令牌：

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

设备令牌仅在桌面应用与网关使用，绝不能加入 `NEXT_PUBLIC_` 或提交到仓库。

```sh
pnpm realtime
pnpm dev
```

分别在两个终端运行。修改 `NEXT_PUBLIC_REALTIME_URL` 后重新启动 Next；生产环境需重新构建。桌面服务地址填写网关 origin，不要追加 `/socket.io`。浏览器只能读取；写入必须通过作者鉴权。

## 稳定性边界

- 客户端断线采用有抖动的指数退避，队列只保留最新状态。重连后重新获取写入租约并全量上报。
- 每次上报有版本与单调序号；服务端重复确认同一序号，不让旧序号覆盖新内容。作者连接获得租约，旧连接断开不能删除新连接状态。
- 默认每 5 秒本机采样，仅变化时发送；25 秒发送心跳，75 秒不更新即离线。时间由服务端产生；浏览器也有过期定时器。
- `apps[0]` 是页头图标展示的软件：优先当前聚焦且已监听的运行应用，其次是最近聚焦且仍在运行的监听应用，最后按监听列表顺序回退。其余应用保持列表顺序供悬停详情展示。只监听一个运行软件时始终展示它；离线、暂停或没有运行软件时显示状态文字。无需新增协议字段，旧客户端仍可按原顺序展示。
- 认证错误需要修改令牌后手动重连；临时网络与服务不可用会重试。另一设备接管后旧设备停止写入，避免抢占循环。
- 事件经过 zod 严格校验、体积限制、来源校验、握手及消息限流。公网必须部署 TLS。网关不信任任意 `X-Forwarded-For`；反向代理后的握手限流按实际 TCP 来源聚合，大流量需在可信入口做分布式限流。
- 状态是临时快照，不是持久消息队列。ACK 表示状态已被接受并触发广播，不代表所有访客已收到。

## 多实例部署

生产模式必须配置 Redis，建议独立的 Redis 7 实例。Socket.IO 通过官方 Redis Streams adapter 跨实例传播消息；作者状态通过 Redis Lua 原子更新。命名空间隔离 stream、控制通道与状态键。作者键共享 hash tag，以支持 Redis Cluster 的原子操作。

Redis 不可用时停止接受需要 Redis 的更新，不静默回落到本机状态。不要让业务状态 Redis 使用 `allkeys-lru` 随机驱逐租约和 revision；现有 compose 的 Redis 是可淘汰缓存，生产实时服务应使用独立实例或改为合适的容量与 `noeviction` 策略。Redis 端口仅在可信内部网络开放。

服务可用性检查：`GET /healthz`。关闭时停止接收连接并释放资源。使用 systemd、容器编排或其他进程管理器托管独立网关；反向代理 `/socket.io/` 必须支持 WebSocket Upgrade，空闲超时建议大于 75 秒。仅使用 WebSocket，因此无轮询粘性会话要求。

## 共用基础设施

- 浏览器通过 `src/shared/realtime/client.ts` 引用计数，共享每个标签页的一条 Socket.IO 连接。
- `src/shared/realtime/protocol.ts` 定义跨端公开协议。
- 原有 `getPubSub()` 仍可使用，底层实现抽到 `src/server/realtime/bus.ts`。修复了并发初始化、同频道订阅相互退订、监听器异常和关闭生命周期问题。
- 网关通过同一 PubSub 实现发布 `author:changed`，供服务端扩展消费。Redis PubSub 本身不补发离线消息；重要工作使用持久队列或数据库 outbox。
- 世界空间应按区域划分房间、服务端校验意图、限制频率。访客聚合必须处理多实例唯一身份与隐私。Agent 使用独立鉴权、明确权限和持久命令 ID，不能复用公开 reader 或作者状态令牌执行命令。

## 验证

```sh
pnpm test:realtime
pnpm check
pnpm build
cd desktop
go test -tags ci ./...
```

可选集成测试环境变量：

- `REALTIME_TEST_REDIS_URL`：运行真实 Redis PubSub 和 Lua 租约测试。
- `REALTIME_TEST_REDIS_STREAMS_URL`：Redis 7，运行双网关跨实例广播测试。
- `REALTIME_GO_PROBE`：指向下列命令生成的测试客户端，验证 Go 与官方 Socket.IO 互通。

```sh
cd desktop
go build -o ../.cache/go-probe ./internal/realtime/testdata/probe.go
```

Windows 原生媒体烟测可显式设置 `TIDEPAGE_NATIVE_TESTS=1`，需要正常桌面用户会话；受限沙箱和 CI 服务会话不一定允许系统媒体访问。
