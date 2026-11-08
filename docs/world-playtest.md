# 虚拟世界场景实测

使用独立 Chrome 的实际 WebGL 渲染，测试页面只访问本地项目。不会控制已有浏览器窗口、读取账号 Cookie 或修改浏览器安全设置。实测 GPU 为 NVIDIA GeForce RTX 5060 / ANGLE D3D11；桌面 1280 × 800，手机布局 390 × 844。

## 复现

先构建并启动本地预览，再在另一个终端运行：

```powershell
npm install --prefix .cache/world-playtest --cache .cache/npm-playtest playwright-core --no-audit --no-fund --ignore-scripts
node --import tsx scripts/playtest-world.mjs http://127.0.0.1:3002
```

预览可使用 `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3002`。设置 `PLAYTEST_CHROME` 可指定已安装的 Chrome 可执行文件路径。脚本依赖已配置的实时客户端地址与启用的 AI 界面；不调用真实模型。

脚本创建仅监听回环地址的临时同源代理、内存实时网关及两个测试身份，结束后关闭。身份仅注入测试页面；AI 响应和票据在代理里提供，不写入站点数据库。附近消息与移动使用项目真实的 Socket.IO 网关和服务器移动校验。没有将模拟回复当作真实 AI 调用结果。

## 检查与证据

产物在 `.cache/world-playtest/final/`：

| 文件                         | 实际检查                                             |
| ---------------------------- | ---------------------------------------------------- |
| `nearby-player-speech.png`   | 第二个独立浏览器收到附近玩家发言，显示一次           |
| `scene-dialogue.png`         | 玩家输入和 AI 测试回复分别跟随角色；侧面镜头露出双方 |
| `companion-conversation.png` | 水獭和海龟先后发言，气泡跟随各自角色，可停止         |
| `coast-motion.webm`          | 通过键盘实际驶离码头，录制 4 秒 WebGL 航行画面       |
| `coast-following.png`        | 船到达离岸海面，旅伴追上并停留在附近                 |
| `mobile-dialogue.png`        | 返航、下船、步行到小屋后，在 390px 视口继续对话      |
| `mobile-companions.png`      | 手机布局中双方气泡可见，旅伴停留间距大于 1.8 米      |
| `report.json`                | GPU、检查结果、位置、气泡边界和浏览器/GL 错误        |

失败时额外保存 `failure-*.png` 和当时的角色坐标、页面文字。截图附带同名 JSON 角色坐标。脚本会断言船确实离开码头、角色实际抵达小屋，而非仅等待固定时间或仅验证按钮存在。另有手动操作昼夜切换和抬头后保存的 `night-sky.png`。

## 水面判断范围

先在岸边冻结环境时间，再沿同样的路径微移镜头，对照原尖锐高光与调整后的宽高光。选定水面区域连续 10 帧、每步平移 0.025 米，灰度变化大于 20/255 的像素对比例从约 0.57% 降为 0；平均绝对灰度变化约为 1.34 → 1.88，说明宽高光仍有正常的连续明暗变化，并非整个画面不再变化。原始读数在 `.cache/world-playtest/glint-comparison.json`，前后画面在同目录 `glint-before.png`、`glint-after-probe.png`。

这是对该视角强亮点跳变的验证，不是对全部海岸、任意显卡和任意镜头的零闪烁保证。OAuth 回调、12 人满房和低端手机性能仍需各自环境验收。

## 真实服务验收（2026-11-08）

`scripts/verify-live-site.mjs` 另行验证真实 HTTP 接口、数据库会话和配置的模型服务，不拦截 AI 响应。它只允许本地预览地址，创建临时读者和短期会话；写作与工作台检查时仅将该临时账号提升为 author，最终删除该账号及级联的会话、工作副本，不发布测试文章。运行结束检查 `report.json` 中的 `cleanup`。

先启动独立预览，`SITE_URL` 必须与测试地址一致。PowerShell 示例：

```powershell
$env:SITE_URL='http://127.0.0.1:3002'
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3002
```

另一个终端运行 `node scripts/verify-live-site.mjs http://127.0.0.1:3002 --live-ai`。此模式会发送测试问题和公开站点上下文到现有模型服务，通常调用四次：水獭回复、两位陪伴者各一句、写作润色。仅检查搜索、阅读与草稿保存时使用 `--workbench-only`，不调用模型。

本次真实服务检查通过：中英文九个公开页面在桌面/手机的 36 组布局、RSS/sitemap/robots/llms 输出、水獭场景回复、两位陪伴者前后文传递与停止，以及写作 SSE 的文本和完成事件。画面与报告位于 `.cache/live-site/`，包括 `real-ai-guide.png`、`real-ai-companions.png`。工作台模式的产物位于 `.cache/site-workbench/`。测试页面使用独立预览端口，现有实时网关不接受该来源；多人链路仍由前述隔离网关测试覆盖，不将这个来源限制计为 AI 验收失败。

数据库另经 `pnpm run db:check` 和 `pnpm run db:verify` 验证：12 项迁移齐全，设置、草稿、发布、回收站、多语言、头像和评论读取通过，全部临时记录回滚。Redis 认证修正后，独立预览健康检查中的 PostgreSQL 和 Redis 均为 `ready`。GitHub 参数齐全仅表示已配置，不代表已完成用户交互式 OAuth 授权；Gitee 尚未配置。

工作台浏览器补验已通过搜索公开文章、打开正文、手机阅读，以及新建私有草稿、实际保存、刷新恢复、预览。截图包括 `.cache/site-workbench/article-reading-mobile.png` 和 `saved-draft-preview.png`。期间遇到 PostgreSQL 建连超过原先 3 秒限制和 Redis 首次建连超过 1.5 秒限制；已将两者改为有上限的可配置等待，分别默认 10 秒和 3 秒，继续保留查询超时与缓存降级。后续通过并不等于所有网络环境都不会超时。

人工查看手机截图还发现正文列被长代码/表格撑宽，但页面 `overflow-x: clip` 隐藏了溢出；仅检查整页滚动宽度无法发现。文章单列网格已改为 `minmax(0, 1fr)`，正文允许收缩，长代码与表格保持各自局部滚动。脚本追加正文实际边界断言，防止正文被裁掉却报告通过。
