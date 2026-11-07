# 海湾美术资源

人物正在验证“原创卡通参考图 → 免费图生 3D → Blender 整理为可定制底模”的路线。此前自建模型未通过验收，已移出项目；目前游戏里的人物尚未替换。

## 当前方向（2026-11-07）

用户明确要求：免费、治愈系、真正的卡通小人，男女都有。已否定 Snow / Rain、QUBITS 以及后续带写实脸部结构的人物。停止这些候选的适配，不能再将其推荐或接入。

筛选标准：圆头短身、简化可爱的五官、柔和玩具质感、低饱和色、日常服装，适合海湾散步与陪伴。以《动物森友会》式的抽象程度作为比例与五官方向参考，不使用该游戏的提取资产。排除真实鼻梁、厚嘴唇、成人脸部结构、皮肤写实质感；排除盔甲武器和战斗英雄造型；排除付费包。仅仅标为 stylized、chibi 或 cartoon 不代表外观合格。

目前尚未选定符合这些要求的免费成套资产。先核对作者实图和授权，再做适配；不能拿概念图冒充可下载模型，也不能为了免费而降低外观要求。以下付费条目仅保留为淘汰记录。

## 可捏脸角色方案（2026-11-07，设计与试验中）

用户同意尝试免费图生 3D，并希望玩家能自己捏脸。采用统一拓扑、骨骼和模块接口；生成模型只作为美术源，不把每次 AI 生成的不同拓扑直接当作玩家底模。玩家调整外观在浏览器本地完成，不消耗生成 API 配额。

- 第一份新参考为 [卡通角色建模输入 v2](cartoon-avatar-input-v2.png)：内置 imagegen 生成的透明背景单人 A 姿势图，圆头短身、简化五官、海盐绿上衣与奶油色短裤。用户已回复“这个方向可以，继续做”，确认沿用此卡通方向。它仍是概念输入，不是 GLB、真实模型渲染或已完成角色。
- 男女各有初始造型，共享底模与骨骼；发型、衣服与配饰不按性别限制。先完成一个可变形底模及两套外观，再扩展部件。
- [女孩预设参考 v2](cartoon-avatar-female-input-v2.png) 从已确认的卡通方向编辑而来，保持相同头身与基础服装结构，改为圆润短发、发夹和桃色上衣。仅为第二套外观设计参考，尚未进行图生 3D；不能把图片相似视作实际网格拓扑一致。
- 脸部使用预设加有限范围微调：脸宽、下巴圆润度、眼睛大小、眼距、眼睛高度、嘴部宽度与高度。简化眼型、嘴型与腮红使用经过制作的样式资源；眼睛和嘴部的变形需跟随脸部，不只缩放整个头部。
- 捏脸形态与表情分开：`face_*` 保存外观，`expr_*` 控制眨眼、微笑等临时表情。眼睑、眼睛与嘴部需一起验证极值组合，避免穿出脸部、闭眼露底或微笑变形。脸部拓扑与 UV 在所有形态键间保持一致。
- 头发、上装、下装、鞋和配饰是独立部件，使用固定挂点或同一骨架蒙皮。第一版保持身体尺寸固定，避免全身比例滑块导致衣服、椅子和双人动作失配；体型扩展需要服装补偿形态与动作验证后再开放。

### 界面与存储

沿用 `HarborWardrobe` 入口，增加可旋转的角色近景与脸部 / 头发 / 服装 / 配饰分类，进入脸部编辑时拉近镜头。预设先行，微调按需展开；支持撤销、重置、取消与保存。编辑仅修改草稿；取消恢复原外观，保存后才提交并广播，避免当前逐次变更立即持久化的行为。恢复游玩时恢复相机和移动输入，保留键盘操作、焦点恢复与减少动态效果支持。

当前 `coast-avatar-v1` 仅保存在 localStorage，不能宣称跨设备同步。第一版保留本机保存；账号装扮持久化作为单独后续工作。旧数据需迁移到新预设并保留可对应的肤色、发色、服装色。

### 协议与运行时接入

现有 `shared/contracts/coast-space.ts` 是严格的 v1 外观 schema；`useCoastConnection` 已通过 `world:appearance` 同步外观。不能直接向旧服务增加字段，否则再次出现严格校验拒绝的问题。

计划在资产可用后实现 v2 配方：`assetRevision`、预设 ID、部件 ID、受限色值、有限个 0–100 的脸部参数。资源 ID 使用白名单，不接收任意模型 URL。先部署兼容 v1/v2 的服务，再发布新客户端；加入时明确协商外观能力，不支持 v2 的服务器使用显式 v1 回退。新客户端能把旧玩家映射到新底模。房间快照、断线重连和合照使用同一版本化配方。

兼容握手先发旧服务能接受的 v1 加入消息，由新服务 ACK 宣告外观能力，再通过单独的能力协商切换；不能在第一次严格 v1 加入请求里塞新字段。新服务向旧客户端发送快照与合照时也必须投影为 v1 外观，避免只解决上行而破坏旧客户端的下行校验。

运行时沿用 `createCoastAvatar` 的 root / dress / update / dispose 接口，并覆盖本地玩家、远端玩家和合照分身。缓存源 GLB，每个实例独立骨架、形态权重和可变材质；不能因一个玩家换肤色影响其他玩家。使用受控资源引用计数，避免销毁某一角色时释放共享资源。

### 资产验收顺序

参考分析与制作约束：目标是网页多人游戏近景主角。已确认参考呈正面、近似正交投影，全身约占画面高度 96%；头高约占全身 37%，圆润头部、短躯干、分开的手脚和有层次的整块发束决定轮廓。主色以参考图为准，近似为头发 `#8A5940`、肤色 `#F1BF96`、上衣 `#8FAEA2`、领口 / 鞋 `#EFE0C2`、眼嘴 `#40291D`、腮红 `#ECA184`。柔和哑光材质、宽软主光与填光；不使用写实皮肤细节。首次模型评审保持同类正面机位，再补侧面和背面，不能用光照掩盖轮廓差异。

运行时维持 Y 向上、面向 +Z、脚底局部原点，并沿用现有角色约 2.1 单位高的玩法尺度；Blender 内部采用 Z 向上并在导出时转换。原始生成网格可高于运行预算，正式 LOD0 以每人 20–35k 三角形、可见材质不超过 6 个、贴图以 1K 为主作为待实测目标，头部近景可用 2K。不得为了预算破坏脸部或关节；不能把这些目标当作已测性能。

1. 免费 API 生成一个候选并下载实际 GLB，检查前、侧、后视图；单张图不可见部分是推测，不能承诺 1:1。
2. 在 Blender 清理 / 重拓扑、分离可换部件、整理 UV 与材质，再制作捏脸形态、骨骼及动作。自动减面不等于适合关节和脸部的拓扑。
3. 导出后重新载入，检查形态键、蒙皮、颜色与动作；验证站立、走跑、坐下、挥手以及脸部参数极值。
4. 双客户端验证外观保存、取消、刷新、重连、合照与互不串色；最后验证多人场景的帧率、下载体积和内存。任何一步未通过，不替换正式人物。

免费服务目前用于资产生产试验，不作为玩家游戏时的在线依赖。候选与下载日志放入被忽略的 `.cache/image-to-3d/`，只有验收后的资产进入 `public/models/`。当前尚未实现捏脸界面、v2 协议、角色骨骼或新游戏模型。

<details>
<summary>参考图 v2 的生成记录</summary>

工具：内置 imagegen；透明背景参数为 true；未使用付费图生 3D API。完整提示词：

```text
Use case: stylized-concept. Asset type: single character reference image for image-to-3D reconstruction, NOT a game screenshot. Create an original irresistibly cute cozy coastal fantasy village human avatar, masculine/androgynous appearance, adult player represented as a tiny cartoon toy person. Precisely 2.6 heads tall, big softly rounded head, short softly sculpted torso and limbs, tiny subtle nose with no nose bridge, two simple dark oval eyes with tiny highlights, small curved smiling mouth, subtle peach cheeks, no realistic facial anatomy. Soft chestnut chunky sculpted short hair with a gentle side fringe, rounded ears visible. Wearing a simple loose muted seafoam short-sleeve shirt with cream collar, warm cream shorts ending above knees, rounded cream slip-on shoes. Hands simplified but distinct thumb, no hand props. Carefully designed smooth continuous surfaces, clean friendly polished stylized game art, soft matte materials, no skin pores or realistic strands. Exactly one full body character, head to toe uncropped, straight front view with very mild depth, orthographic lens, neutral relaxed A pose arms 30 degrees from sides, both hands fully visible and separated from torso, legs slightly apart, feet flat at same level. Transparent background, no floor, no cast shadow, no scenery, no text, no base, no accessories, no turnaround sheet, no extra faces. Broad gentle neutral studio illumination with minimal baked shadow. All details readable. Cute and charming, completely cartoon, never realistic or adult anatomical proportions, no skinny long neck, no armor, no anime hero, no square block hands.
```

</details>

<details>
<summary>女孩预设参考 v2 的生成记录</summary>

工具：内置 imagegen 编辑；参考图为 `cartoon-avatar-input-v2.png`；透明背景参数为 true。完整提示词：

```text
Use case: identity-preserve. Asset type: female preset concept for the SAME modular cozy cartoon game avatar system. Edit the supplied approved character reference. Keep the exact head size, face shape, tiny nose, simple oval dark eyes, small smile, short body proportions, full-body frontal A pose, hand shapes, legs, shoe shapes, soft matte toy-like rendering, framing and transparent background. Change only these modular appearance elements: make the chestnut hair a cute smooth rounded chin-length bob with a soft side fringe and a small pale seafoam hair clip; change the seafoam shirt to a muted dusty peach shirt with the same cream collar and matching construction. Keep the cream shorts and shoes. A charming feminine preset with the same underlying face and skeleton proportions, not a realistic woman, no makeup, no adult anatomy, no long neck, no jewelry, no accessories in hands. Exactly one full body avatar. No text, no floor, no cast shadow. Preserve transparent alpha background.
```

</details>

- [QUBITS Chibi Heroes](https://qubits.gumroad.com/l/WNNT)：用户已否定外观，且为付费模型；淘汰，未购买、未导入。
- [Meshtint Cute Series 男角色](https://www.meshtint.com/products/male-knight-modular-pack-01-cute-series) / [女角色](https://www.meshtint.com/products/female-knight-modular-pack-01-cute-series)：付费且为骑士装束，不符合当前要求，淘汰。
- ThreeDee Chibiz 仅作外观研究，暂不采用：[作者授权](https://www.threedee.design/license/)明确要求公开浏览器 GLB 分发及用户自定义另行书面授权。

价格为本次官方页面查询值，不代表已获购买授权。

## 本地联机验证（2026-11-07）

沿用现有 Socket.IO，无需重做。17 项相关回归中 16 项通过，1 项 Redis 集成因无测试实例跳过；两个浏览器玩家实际进入同一海湾，互相显示，移动后位置同步，并完成邀请、接受、倒数、两端生成合照，检查的浏览器控制台没有错误。此验证使用本地内存房间，不能代替公网部署、Redis 或远程设备网络验证。

用户确认尚未部署，当前地址为 localhost。下一步公网试玩需要部署已有 web / realtime / nginx，参考 `docs/deployment.md`；尚无可发给异地朋友的公网链接。

## 视觉参考

- [卡通旅人参考](cartoon-traveler-reference.png)：生成的概念图，用于说明卡通比例和服装方向，不代表已完成模型。
- [海湾参考](bay-reference.png)：生成的概念图，用于说明海湾空间与材质方向，不代表已完成模型。

## 历史人物候选（已停止）

| 模型    | 官方来源                                         | 授权与要求                                                                | 状态                                         |
| ------- | ------------------------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------- |
| Spring  | https://studio.blender.org/characters/spring/v1/ | CC-BY；署名 `Spring Rig (CC-BY) Blender Foundation \| studio.blender.org` | 优先候选：已检查官方实物预览，已核实下载地址 |
| Snow v4 | https://studio.blender.org/characters/snow/v4/   | CC-BY；署名 `Snow Rig (CC) Blender Foundation \| studio.blender.org`      | 备选：已检查官方实物预览，已核实下载地址     |

Spring 是带外套、围巾和靴子的卡通旅人，轮廓比现代服装的 Snow 更适合当前世界。两者都有官方角色骨骼；网页端动作、蒙皮和性能尚未验证。

官方资源地址：

- [Spring 官方预览](https://studio.blender.org/files/public/1b/1bffff08b464375d842e7da43b4f5293/1bffff08b464375d842e7da43b4f5293-thumbnail.jpg) · [源文件下载](https://studio.blender.org/download-source/files/1b/1bffff08b464375d842e7da43b4f5293/1bffff08b464375d842e7da43b4f5293.zip)，官方页面标注 406.5 MB。
- [Snow 官方预览](https://studio.blender.org/files/public/thumbnail/ba/0f/ba0fe6d810333b1d73c1c359e4dc03cb-6_m.webp) · [源文件下载](https://studio.blender.org/download-source/files/ba/0f/ba0fe6d810333b1d73c1c359e4dc03cb-6.zip)，官方页面标注 106.4 MB。

源文件尚未作为可用资产引入项目。Snow 的一次下载未完成，不能据此宣称已取得或验证模型。

电影制作角色不等于网页游戏资产。接入前需验证网格、贴图、蒙皮、可导出的动作以及多人场景开销。

## 文件约定

最终使用的 GLB 才进入 `public/models/`，随附来源和授权。第三方原始下载、压缩包、试验导出与过程日志放在被 Git 忽略的 `.cache/`，不再提交重复渲染、`.blend1` 或 Python 缓存。安装好的 Blender 保留，重复安装包已移除。
