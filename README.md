<p align="center">
  <img src="public/assets/brand/tidepage-icon.png" width="72" alt="光阴副本的水獭标志" />
</p>

<h1 align="center">光阴副本</h1>

<p align="center">把经历写成文字，把想法做成作品。</p>
<p align="center">Tidepage 主题 · <strong>0.0.1</strong> · 中文 / English</p>

![光阴副本首页：纸白底色、手绘海岸与最近文章](docs/screenshots/home.png)

光阴副本是 adnaan 记录技术、设计与日常的个人博客，使用 **Tidepage** 主题。文章是整理后的思考，手记收藏稍纵即逝的片段，项目留下想法变成作品的过程。纸面纹理、手绘线条与暖色光晕串起这些记录，海岸则留给偶尔想慢下来的人。

仓库包含基于 Next.js、PostgreSQL 与 Three.js 的博客、内容工作台和实时服务，可自行部署并配置自己的资料与内容。

## 这一版有什么

- **阅读与记录**：文章、手记、项目、一言、照片廊和友联；中英文内容、深浅主题、搜索、阅读工具、RSS 与站点地图。
- **内容工作台**：富文本编辑、图片上传与裁剪、草稿、按语言发布、回收站、站点资料与 SEO 设置。配置模型服务后，可使用流式写作和翻译助手。
- **读者互动**：GitHub / Gitee 登录、账号头像、评论、表情、点赞与收藏。正文和互动数据存入 PostgreSQL。
- **可探索海岸**：三维海湾、角色步行与动作、多人同行、合照和地点手账；还可以驾船探索群岛。
- **桌面状态助手**：Go + Fyne 原生 Companion，通过软件白名单分享正在使用的应用及歌曲，配合独立实时网关显示在网站页头。

这是首个早期版本。海湾角色仍在迭代，暂不支持捏脸和云端照片相册；评论后台管理、完整编辑历史和离线写作恢复尚未提供。macOS 桌面包目前使用 ad-hoc 签名，正式分发前还需要真机验证、Developer ID 签名和公证。

## 本地运行

需要 **Node.js 24**、**pnpm 12.16.1** 和可连接的 **PostgreSQL**。仓库不包含个人数据或生产密钥。

```sh
npm install --global pnpm@12.16.1
pnpm install --frozen-lockfile
```

将 `.env.example` 复制为 `.env`，填写 `DATABASE_URL` 和 `SITE_URL`。已有 `.env` 时保留原配置；个人覆盖可放在 `.env.local`。确认连接的是开发数据库后执行：

```sh
pnpm run db:check
pnpm run db:migrate
pnpm run dev
```

打开 [中文首页](http://localhost:3000/zh-CN) 或 [英文首页](http://localhost:3000/en)。后台地址为 [工作台](http://localhost:3000/zh-CN/admin)。初次部署内容需要自行录入或迁移，README 截图中的个人文章不随仓库提供。

### 登录和站主设置

在 `.env` 中配置 GitHub 或 Gitee OAuth 应用，回调地址为 `<SITE_URL>/api/v1/auth/github/callback` 或 `/api/v1/auth/gitee/callback`。将自己的账号绑定为站主：

```sh
pnpm admin:setup --github <你的用户名>
# 也可使用 --gitee，或同时绑定两个平台
```

登录后，在「站点设置」填写姓名、头像、首页介绍、社交链接和 SEO 信息。站点作者资料与登录账号头像分别管理，字段旁标明展示位置。详见 [工作台说明](docs/workbench-development.md)。

### 实时功能与桌面助手

多人海湾和桌面状态依赖独立网关。按 [实时服务说明](docs/realtime.md) 配置 Redis、服务地址与私密令牌后，另开终端运行：

```sh
pnpm run realtime
```

桌面助手的安装、三平台构建和权限说明见 [Companion](desktop/README.md)。仅运行博客阅读和写作时，无需安装桌面助手。

## 部署

项目提供 Docker Compose，编排 Web、实时网关与 nginx；PostgreSQL、Redis 使用外部服务。先配置域名、HTTPS、OAuth、数据库和上传目录，再按 [部署说明](docs/deployment.md) 执行迁移与启动。

上传文件默认存储在 `storage/uploads`，通过 `UPLOAD_DIR` 指定持久化目录。数据库与上传目录需一起备份，不能把上传文件放入 Next.js 构建产物。

## 开发与资源

```sh
pnpm run check   # 格式、静态资源、模块边界、类型和测试
pnpm run build   # 生产构建
```

| 目录                                      | 内容                                   |
| ----------------------------------------- | -------------------------------------- |
| `src/app/`                                | 页面路由、HTTP API、SEO                |
| `src/modules/`                            | 内容、账号、媒体、互动和海岸等业务     |
| `src/shared/`、`src/widgets/`             | 共享组件与站点外壳                     |
| `services/realtime/`、`desktop/`          | 实时网关与原生桌面助手                 |
| `public/assets/`                          | 网页使用的图片、表情、字体、音频和 GLB |
| `assets/source/`                          | 品牌与模型制作源，不随网站分发         |
| `docs/screenshots/`、`artifacts/reviews/` | 项目展示配图与开发检查截图             |

新增素材需登记用途和来源。旧资源 URL 保留兼容映射，历史正文和表情引用仍可访问。目录约定、授权记录和检查命令见 [ASSETS.md](ASSETS.md)。

| 文档                                                                          | 用途                           |
| ----------------------------------------------------------------------------- | ------------------------------ |
| [项目架构](docs/architecture.md)                                              | 从路由找到业务、数据与接口     |
| [前端架构](docs/frontend-architecture.md) · [设计系统](docs/design-system.md) | 组件分层、样式、字体与交互规范 |
| [工作台](docs/workbench-development.md)                                       | 内容字段、发布、上传与账号     |
| [部署](docs/deployment.md) · [实时服务](docs/realtime.md)                     | 服务配置、联调与健康检查       |
| [海岸与海湾](docs/world.md)                                                   | 场景操作、实现入口与当前限制   |
| [旧数据迁移](docs/legacy-mysql-migration.md)                                  | 从旧博客迁入内容与媒体         |
| [版本记录](CHANGELOG.md)                                                      | 0.0.1 的范围与发布验证要求     |
