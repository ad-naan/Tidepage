# 实时连接与桌面助手

实时服务位于 `services/realtime`，独立于 Next.js 运行。Next Route Handler 不挂 WebSocket。当前已接入作者状态链路，以及落日海湾的匿名访客、装扮、行走、挥手、分配座位和重连。站长身份认证、合影邀请、持久打卡与 agent 命令尚未实现。

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

分别在两个终端运行。修改 `NEXT_PUBLIC_REALTIME_URL` 后重新启动 Next；生产环境需重新构建。桌面服务地址填写网关 origin，不要追加 `/socket.io`。作者状态仍只允许通过作者鉴权写入；浏览器可以发送下文列出的世界空间访客意图，不具有站长或账号权限。

## 落日海湾多人空间

配置网关地址后进入 `/{locale}/explore` 会加入同一个 `sunset` 海湾；打开第二个独立标签页即可查看彼此。界面显示服务端实际人数，支持「独自看海」离开与「加入同行」重试。未配置地址时保留单人体验。

- 公开协议在 `shared/contracts/coast-space.ts`。`world:join` 接收版本、装扮与可选匿名续接令牌；`world:input` 仅接收序号、归一化方向和动作；`world:appearance` 修改枚举装扮；`world:leave` 离场；`world:snapshot` 下发公开角色状态。
- 客户端不提供人物 ID、世界坐标、角色权限或任意资源 URL。网关签发随机匿名身份与 256 位续接令牌，房间存储只保存令牌摘要；公开快照不含摘要、socket ID 或续接令牌。续接令牌不是站长 / 账号凭证。
- 每个网关以 10Hz 读取和推进权威房间，向自己连接的成员发送全量快照；客户端预测自己的步行，平滑校正并插值其他人物。服务端限制速度、海岸与建筑碰撞，输入超过 600ms 未更新即停止行走，15 秒未心跳即退出在线列表。
- 房间最多 12 位在线旅人，长椅分配三个独立座位；这是配置上限，尚未完成实体手机或满员性能压测。满员有明确提示，当前未实现自动分房或邀请链接。
- 刷新 / 断线后以标签页 `sessionStorage` 中的令牌恢复身份并重新拉取全量状态。旧连接不能移动或删除接管后的角色。重复或过期输入序号不会覆盖新输入。匿名续接状态最多保留 30 分钟、最多 256 项；离场后只保留临时续接信息。
- 同行共享房间昼夜：每轮 30 分钟，前 20 分钟日落、后 10 分钟星夜。个人音量、镜头和画质不广播；独处时可自由切换昼夜。
- 单实例开发使用内存房间；配置 Redis 后，所有实例使用同一个受容量限制的房间文档，通过 CAS 原子提交，并使用 Redis 时钟推进。Redis 不可用时不会切到独立内存世界，客户端显示重连状态；Redis 房间键最后一次更新后 40 分钟过期。

登录用户通过 `POST /api/v1/world/ticket` 获取 3 分钟有效的签名身份，在加入和每 90 秒续期时交给网关。只有 `admin` 角色且账号 ID 等于 `ADMIN_USER_ID` 才显示站长标识；未登录、未指定或身份过期时不显示。站长小屋不代表站长在线。公开快照只含显示名、标识和匿名房间 ID，不暴露账号 UUID 或签名凭证。

`photo:invite` 邀请附近 8 米内的一位旅人；`photo:respond` 接受、拒绝或取消。邀请只在双方各自的 `world:snapshot.photo` 中出现，30 秒超时；接受后才将双方放到落日沙滩，锁定移动并倒数 4 秒。服务端冻结角色装扮、位置、光线和拍摄时刻，两个浏览器按同一构图生成 1440 × 960 PNG。任一人离场或取消都会终止尚未完成的合照；不通过 socket 传输图片。照片预览与下载无需登录。

`world:receipt` 仅为登录身份签发真实位置打卡或已完成合照的凭证，5 分钟有效并绑定当前账号。地点要求距离地标 1.8 米以内；合照凭证需在拍摄后约 2 分钟内申请，仅参与者可申请。`POST /api/v1/world/memories` 验证签名、用途、有效期和当前登录账号，同源写入 PostgreSQL；同账号同一北京时间日期同一地点只存一条，合照按拍摄 ID 幂等。`GET /api/v1/world/memories` 只返回本人记录，20 条游标分页。手账保存纪念元信息，照片文件只下载到设备，没有云端照片托管、公开相册、私聊或访客自定义文本。

Next.js 与网关必须配置同一个私密 `REALTIME_AUTHOR_TOKEN`（至少 32 字符），禁止放入 `NEXT_PUBLIC_*`；沿用现有会话与 OAuth 配置。运行 `pnpm db:migrate` 应用 `0007_coast_memories.sql` 后才能存取手账。没有配置签名密钥时账号接口返回 `WORLD_UNAVAILABLE`，匿名同行与合照仍可运行。构建与测试不会替使用者迁移实际数据库。建设顺序及模型文件见 [海岸空间规划](coastal-space-plan.md)。

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
