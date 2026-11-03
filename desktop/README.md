# 潮汐 Companion

Go + Fyne 原生桌面助手，支持 Windows、macOS、Linux。没有 Electron、WebView 或浏览器运行时。

一个可执行文件有两个运行模式：通常启动的是托盘主进程，负责白名单采集与 Socket.IO 连接；打开窗口时按需启动同一个程序的 `--ui` 模式。关窗后 GUI 进程退出，托盘与采集继续运行。不要把 GUI 的内存和常驻进程的内存混为一谈。

## 使用

1. 按 [实时服务说明](../docs/realtime.md) 启动网关。
2. 启动应用，打开“偏好设置”，填写服务地址和设备令牌。公网地址必须使用 HTTPS，本机允许 `http://localhost:3101`。
3. 在“软件监听”添加进程名或完整可执行文件路径，填写你希望公开的名称，保存。
4. 按列表顺序展示正在运行的软件；软件图标和歌曲信息可以分别关闭。暂停分享会清空公开软件与歌曲。

三个平台的主窗默认都是 640 × 460（逻辑像素）。Windows 使用无边框窗口，可拖动左上角品牌区移动窗口，或拖动右下角调整大小。macOS 使用同色标题栏和系统红黄绿按钮；Linux 的标题栏、拖动和缩放由当前桌面环境管理。关闭窗口后，可从托盘重新打开。

令牌使用 Windows Credential Manager、macOS Keychain 或 Linux Secret Service 保存，并与服务地址绑定。配置文件不含令牌。Linux 需要可用且已解锁的密钥环；失败时不降级为明文文件。

软件图标在本机转成 48 × 48 PNG，自动图标不可用时可以选择自定义 PNG。不发送完整进程列表、窗口标题、执行路径或文件名。

### 系统差异

| 系统                  | 音乐                                                          | 自动图标                                                     | 自动启动                           |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| Windows 10 1809+ / 11 | 公共 Windows 系统媒体会话；播放器需提供 SMTC 元数据           | Shell 可执行文件图标                                         | 当前用户 Run 注册表项              |
| macOS                 | Music / Spotify 的公共 Apple Events，可能需要你允许自动化权限 | 应用包 ICNS，经系统 sips 转换一次后缓存                      | 当前用户 LaunchAgent，下次登录生效 |
| Linux                 | 提供 MPRIS 的播放器，桌面会话 D-Bus                           | desktop 文件和常见主题的 PNG 图标；SVG-only 主题可手动选 PNG | XDG autostart                      |

Linux 托盘依赖桌面环境支持状态指示器，GNOME 通常需要 AppIndicator 支持。Wayland 下采用进程白名单，不读取其他应用窗口内容。应用不使用 macOS 私有 MediaRemote API。

## 开发

Go **1.26+**。Fyne 构建需要 C 编译器和系统图形开发库；应用业务和平台适配代码均为 Go，不需要维护 C++。

- Windows：安装 Go、MinGW-w64，确保 `gcc` 在 PATH。
- macOS：安装 Go 与 Xcode Command Line Tools。
- Debian / Ubuntu：`sudo apt install gcc pkg-config libgl1-mesa-dev xorg-dev libwayland-dev libxkbcommon-dev libayatana-appindicator3-dev`。中文字体已随应用打包。

在 `desktop` 目录运行：

```sh
go mod download
go run ./cmd/companion
go test -tags ci ./...
```

仅查看界面，避免自动采集、联网或保存应用配置：

```sh
go run ./cmd/companion --preview
go run ./cmd/companion --preview --page watch
```

手动选择本地文件或进程时，图标预览会读取你选择的软件；预览不会向站点发送数据。

Windows 日常使用请在 PowerShell 构建一次，再双击生成的 `dist/TidepageCompanion.exe`。构建脚本与 CI 共用同一入口，会校验 exe 的 Windows GUI 子系统。替换旧版本前先从托盘退出潮汐。

```powershell
.\build-windows.ps1
```

在 macOS 或 Linux 本机打包：

```sh
sh build-unix.sh
```

macOS 生成 `dist/TidepageCompanion-macOS.zip`，内含 Apple Silicon 和 Intel 两种架构。解压后将 `Tidepage Companion.app` 放入“应用程序”，用 Finder 打开。包使用本地 ad-hoc 签名，面向公众分发仍需要 Developer ID 签名和公证。

Linux 生成与构建机 CPU 架构对应的 `dist/TidepageCompanion-Linux.tar.gz`。运行需要图形桌面和可用的 OpenGL 驱动。安装到当前用户目录后从桌面应用菜单启动，桌面会话的 `PATH` 须包含 `~/.local/bin`：

```sh
mkdir -p "$HOME/.local"
tar -xzf dist/TidepageCompanion-Linux.tar.gz -C "$HOME/.local"
```

三平台 CI 会测试并构建应用；macOS 检查解压后的预览窗口，Linux 分别用 X11 虚拟显示和 Wayland 合成器检查预览窗口。系统凭据库、真实播放器权限和登录自启动仍需要对应桌面会话验收。

## 从哪里改

| 目录                                      | 职责                                           |
| ----------------------------------------- | ---------------------------------------------- |
| `internal/ui`                             | 纸白 / 海松绿界面、表单与弹窗                  |
| `internal/i18n/locales`                   | 中英文案，新增 key 两边同步                    |
| `internal/tray`                           | 常驻托盘、按需启动 GUI                         |
| `internal/localipc`                       | GUI 与托盘间的认证本机通信                     |
| `internal/collector`                      | 白名单、音乐与图标采集；平台文件按操作系统分开 |
| `internal/config`                         | 有界配置校验与原子保存                         |
| `internal/platform`                       | 系统凭据库、开机自启动                         |
| `internal/protocol` / `internal/realtime` | 版本化 DTO、有限队列、确认、重试、心跳、重连   |

Go 客户端只实现本应用使用的 Socket.IO v4 子集：默认 namespace、WebSocket、JSON、鉴权和 ACK。不支持轮询、二进制包或任意 namespace，互通由官方 Socket.IO 网关测试验证。今后世界互动和 agent 不应绕开服务端的业务鉴权与持久化。

界面字体由项目已有 Noto Sans SC 的 Fontsource 分片合并、固定字重并裁剪为常用简体中文字符集，使用 SIL OFL，许可证位于 `internal/ui/assets/OFL.txt`。托盘图标为本项目原创。
