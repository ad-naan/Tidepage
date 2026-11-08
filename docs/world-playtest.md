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

这是对该视角强亮点跳变的验证，不是对全部海岸、任意显卡和任意镜头的零闪烁保证。真实模型响应、OAuth 登录、12 人满房和低端手机性能仍需各自环境验收。
