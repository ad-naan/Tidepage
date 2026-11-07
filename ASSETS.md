# 静态资源与制作源

## 目录约定

| 位置                                        | 存放内容                                      |
| ------------------------------------------- | --------------------------------------------- |
| `public/assets/brand/`                      | 站点标志、签名和默认作者头像                  |
| `public/assets/illustrations/`、`photos/`   | 插画和照片素材                                |
| `public/assets/stickers/fluent/`            | 表情 WebP 与原始许可证                        |
| `public/assets/models/`、`audio/`、`fonts/` | 网页 GLB、音频、字体及许可证                  |
| `assets/source/`                            | 品牌母版、角色 Blender 源、导出脚本与制作记录 |
| `docs/screenshots/`                         | README 展示截图                               |
| `artifacts/reviews/`                        | Web 和桌面端检查截图，不随网站部署            |
| `storage/uploads/` 或 `UPLOAD_DIR`          | 用户上传内容，独立持久化与备份                |

应用图标等 Next.js 文件约定资源仍放在 `src/app/`。桌面程序通过 Go embed 打包的字体、托盘图标仍与所属 Go 包共置，不与网页资源混用。

## 引用与检查

网页资源登记在 `src/shared/config/static-assets.json`，代码通过 `siteAssets` 引用。表情单独使用 `stickers.json`，保留稳定 ID；不要因为调整目录而改变历史正文中的表情 ID。新增文件运行 `pnpm run check:assets`，检查未登记文件、失效引用、旧路径回流和 GLB 外部依赖。

`legacy-assets.json` 由 Next.js rewrites 提供旧 URL 的兼容访问，不复制二进制文件。存量内容仍可能引用旧的 `/images/`、`/stickers/`、`/models/` 等路径，因此不能只凭源码搜索结果删除照片或音频。用户上传使用稳定的 `/uploads/<hash>.<ext>` 地址，不参与此次目录迁移；清理前必须查询数据库及正文引用。

制作源、检查截图、缓存和备份不进入 standalone 追踪或 Docker 镜像。临时下载和试验放入忽略的 `.cache/`，不要提交安装包、OptiX 缓存、Blender 备份和重复导出。

## 来源与许可

表情来自 Microsoft Fluent Emoji，保留 `public/assets/stickers/fluent/LICENSE.txt`。默认作者头像是个人资料素材，不属于生成插画。品牌母版和生成记录在 `assets/source/brand/`；角色制作、来源与能力限制见下方链接。源文件和许可证一并保留，不能把工具的代码许可当作所有产物的授权。

下表中的二维视觉素材使用内置 ImageGen 生成。海湾三维角色另经图生 3D 与 Blender 制作，来源和当前能力见 [角色资产记录](assets/source/characters/cozy-avatar/README.md)。

| 文件                                     | 用途                              | 生成提示词摘要                                                                                                                                                                                                                                                                            |
| ---------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| public/assets/illustrations/otter-v2.png | 透明背景水獭，嵌入可交互 SVG 海岸 | Fine pen-and-ink naturalist otter, three-quarter profile facing right, broad round head, short muzzle, tiny round ears, creamy whisker pads, compact brown body, thick furry tail, delicate warm watercolor, full body on genuine transparent background. No scenery, text, or watermark. |
| public/assets/photos/coast.png           | 照片廊、唱片标签                  | Quiet analog-film Japanese coastal seascape at late afternoon, pale teal sea, layered blue-gray headlands, ivory wildflowers, muted warm colors and fine 35mm grain, vertical composition, no people or text.                                                                             |
| public/assets/photos/window.png          | 照片廊、唱片标签                  | Afternoon sun through a wooden cafe window, warm ochre wall, white ceramic cup and open notebook on a dark round table, linen curtain, intimate analog-film editorial photography, no people or text.                                                                                     |
| public/assets/photos/meadow.png          | 照片廊                            | Sunlit meadow, delicate grasses and white daisies, a leafy tree and hazy sage-green foothills, warm olive film tones, horizontal composition, no people or text.                                                                                                                          |

照片廊标注为生成摄影素材。局部条目是同一照片的 CSS 裁切展示，并非额外拍摄作品。

`public/assets/audio/coast.wav` 与 `public/assets/audio/afternoon.wav` 为确定性代码合成的 48 秒环境音乐，没有使用外部录音或采样。生成脚本为 `scripts/generate-audio.mjs`。

手写字体衍生自 LXGW WenKai Light，只保留本站需要的字形。原始版权与 SIL Open Font License 保存在 `public/assets/fonts/OFL.txt`。
