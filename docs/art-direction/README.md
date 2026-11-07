# 海湾美术资源

人物正在验证“原创卡通参考图 → 免费图生 3D → Blender 整理为可定制底模”的路线。此前自建模型未通过验收，已移出项目；目前游戏里的人物尚未替换。

## 当前方向（2026-11-07）

用户明确要求：免费、治愈系、真正的卡通小人，男女都有。已否定 Snow / Rain、QUBITS 以及后续带写实脸部结构的人物。停止这些候选的适配，不能再将其推荐或接入。

筛选标准：圆头短身、简化可爱的五官、柔和玩具质感、低饱和色、日常服装，适合海湾散步与陪伴。以《动物森友会》式的抽象程度作为比例与五官方向参考，不使用该游戏的提取资产。排除真实鼻梁、厚嘴唇、成人脸部结构、皮肤写实质感；排除盔甲武器和战斗英雄造型；排除付费包。仅仅标为 stylized、chibi 或 cartoon 不代表外观合格。

目前尚未选定符合这些要求的免费成套资产。先核对作者实图和授权，再做适配；不能拿概念图冒充可下载模型，也不能为了免费而降低外观要求。以下付费条目仅保留为淘汰记录。

## 图生 3D 实测与当前资产状态（2026-11-07）

已用用户本机配置的 Hugging Face 令牌验证免费账号，实际调用 [微软 TRELLIS.2 官方 Space](https://huggingface.co/spaces/microsoft/TRELLIS.2)，完成图片预处理、网格生成、GLB 导出和下载。令牌不写入生成脚本、报告或前端；`.env` 与 `.cache/` 均被 Git 忽略。该路线已跑通，不再只是接口选型。

| 候选                | 实际结果                                                                                          | 独立视觉评审                                    |
| ------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 512 生成 / 1K 贴图  | GLB 3,406,096 字节，97,091 三角面；Blender 导入并渲染四视图                                       | 5/10；眼嘴、颜色、脸颊与鞋跟有明显偏差          |
| 1024 生成 / 2K 贴图 | GLB 3,927,348 字节，97,175 三角面；五官、色彩明显改善                                             | 6/10；鞋后跟仍有错误薄片，仍未通过概念门槛      |
| Blender 鞋部修整    | 重建独立鞋体、鞋底、内壁，去掉错误薄片；修正退化 UV；3 个网格对象、3 个材质，评估后 96,617 三角面 | 仍为 6/10；鞋形偏厚、偏楔形，脸颊与材质仍需精修 |

[鞋部修整后的 Blender 真实模型渲染](cartoon-avatar-model-review.png) 是实际网格的本地渲染，不是生成概念。上表记录当时对原概念的独立评审；随后用户看过这张实际渲染并明确回复“我觉得挺可爱了”，接受此人物外观方向。本轮按用户要求只优化脸颊鼓包，保留已接受的造型；这不等于角色动画、定制能力或游戏接入已经验收。

工作源文件为 `.cache/image-to-3d/refined/candidate-review.blend`，四视图和 `candidate-qa.json` 在同一目录。1024 原始 GLB 保存在 `.cache/image-to-3d/detailed/candidate-source.glb`；保留原始文件以便无损回退。首次 SDK 对同一导出进行了重复下载，第二次下载超时；第一份完整 GLB 已通过文件头长度校验和 Blender 实际导入验证。后续脚本改为只下载一次并验证完整性。

修整版自动几何检查 `pass:true`，但这不代表视觉通过或可用于游戏。保留的警告是主体 UV / 法线接缝拆点，以及主体和鞋内的背靠背面；暂作为静态重建源保留，生产网格须进一步清理和优化。主体仍是头发、衣服和身体融合的三角网格，只有鞋完成独立分件；没有骨骼、蒙皮、脸部形态键或动画。没有接入游戏，没有新增玩家捏脸界面，没有替换旧角色，也没有运行时性能结论。

下一阶段：在保留用户接受的造型基础上建立独立头部、头发、完整身体和服装的动画拓扑，再制作捏脸形态、统一骨骼与动作。男女参考图共享同一美术方向，但目前只有男角色方向进行了 3D 试验。不要将第二张概念图写成已完成的女角色模型。

### 脸颊局部修整（2026-11-07）

用户要求“脸上鼓包优化下”。已在 Blender 修整两侧脸颊表面，并同步更新导入网格的自定义法线；保留圆脸、腮红、眼睛、鼻子、微笑与整体造型。[修整后真实近景渲染](cartoon-avatar-cheeks-review.png) 来自实际模型。前一版源文件和渲染保留，可回退。

当前工作源为 `.cache/image-to-3d/cheeks-refined/candidate-review.blend`。同目录包含正面、右侧、三分之四近景、素模、线框、全身渲染，及 `candidate-qa.json`、`edit-verification.json`。重新打开保存文件比对确认：仅调整主体的 1,827 个局部顶点深度，最大位移约 0.02834（角色高 2.1）；网格连接、UV、材质和鞋体保持一致，五官保护区域未移动。总计仍为 3 个网格、3 个材质、96,617 三角面（主体 84,841，两只鞋各 5,888）。

自动几何检查 `pass:true`、错误为空。原有接缝拆点 13,372 个、主体背靠背面 37 对及鞋内 15 / 12 对的警告数量未增加；为避免本次局部编辑破坏 UV 和鞋结构，暂保留于制作源，后续生产拓扑阶段清理。新模型仍未绑定骨骼或接入游戏。

独立视觉检查认为本轮脸颊局部优化可交付：原腮红下方凸起与暗边明显消失，正面与侧面未见明显新凹坑或接缝，可爱感保留；素模中眼睛外下缘仍有轻微起伏。此结论仅针对本轮局部外观，不将历史整体概念评分改写成游戏资产完成。

### 骨骼与动作试验（2026-11-07，未接入游戏）

在保留上述已接受源文件的基础上，另建 `.cache/image-to-3d/rigged/candidate-rig.blend`。试验版已有 18 根骨骼、6 个蒙皮网格（主体、上衣、左右手臂、左右鞋）、3 个可见材质和 36,288 三角面。网格减少约 62%，但仍略高于原 20–35k 目标；这是优化与绑定试验，不是已经完成手工动画重拓扑。

动作包含 `Idle`、`Walk`、`Run`、`Sit`、`Wave`、`Jump`；Idle 和 Sit 当前是保持姿势，没有呼吸或坐下过渡。走跑、待机和挥手按每帧最低鞋底高度修正根骨垂直位置；这不是已经验证的脚部 IK 或脚步无滑动。上衣独立分件，衣摆权重不再跟随左右大腿。手臂与袖口分离，保留原人物头部与发型。另一次体素重建四肢试验损伤了手部和裤口细节，已排除，当前构建脚本关闭该分支。

测试 GLB：`.cache/image-to-3d/rigged/cozy-avatar-trial.glb`，2,631,008 字节，包含 1 套骨架、18 个关节和全部 6 个动作；已从实际导出重新导入 Blender，确认 6 个蒙皮网格和动作均保留。文件没有进入 `public/models/`，没有替换 `createCoastAvatar`，没有变更 Socket.IO 协议或游戏 UI。

验证记录位于同目录：

- `candidate-qa.json`：静态几何检查通过，错误为空。保留 7,116 个 UV / 法线接缝拆点及 40 对隐藏背靠背面警告；本阶段避免全局焊接破坏生成网格，生产拓扑阶段仍须清理。
- `export-verification.json`：导出体积、网格 / 骨骼 / 动作计数与重新导入结果。
- `motion-verification.json`：6 个动作各抽查 9 帧，坐标有限，权重归一且每顶点最多 2 个骨骼影响；走跑 / 待机 / 挥手抽样鞋底高度误差小于 0.001。没有据此声称蒙皮视觉通过。
- `idle.png`、`walk.png`、`run.png`、`sit.png`、`wave.png`、`jump.png` 及 `walk-preview.mp4`：实际 Blender 姿势渲染和行走循环试验。

**仍未通过动作视觉验收。** 独立检查指出膝盖在坐姿时起皱、弯肘体积不连续、袖口折叠不自然。已修衣摆牵拉、调整屈肘动作和关节权重，但膝肘仍需按关节重新布线、整理袖口与裤口交叠，并验证完整循环与动作切换。当前 `game_ready:false`；不能把本次 GLB 导出成功描述为玩家已经能用新角色游玩。女角色预设、捏脸、换发型、换装和游戏内实例隔离仍未实现。

### 关节重拓扑与网页导出复核（2026-11-07，开发预览）

继续保留用户认可的脸、发型和比例；新增工作源 `.cache/image-to-3d/joints-refined/candidate-rig.blend`，没有覆盖脸颊修整源和上一版绑定试验。重建腿部关节环线，将新手臂连接到保留的手部，增加左右膝盖 / 肘部辅助骨；短裤重建为带连接裤裆、内壁和裤口的连续网格。之前走跑中的黑色裤裆裂缝已消失，坐姿膝盖和挥手肘部不再严重塌陷。[本轮实际 Blender 渲染](cartoon-avatar-joints-review.png) 保留当前外观记录。

实际导出 `joints-refined/cozy-avatar-trial.glb` 为 3,367,456 字节、57,988 三角面、9 个 glTF 网格、5 个材质、22 根骨骼及原有 6 个动作。增加的关节与短裤拓扑令面数高于上一版，**尚未达到 20–35k 运行预算**，不可据此宣称多人性能达标。没有新增捏脸形态、女孩预设或换装能力。

验证证据均保存在 `joints-refined/`：

- `candidate-qa.json`：几何检查通过，无错误；腿和短裤没有开放边、退化面或非流形边。仍保留源网格 UV / 法线拆点、隐藏背靠背面；手臂 UV 重叠约 8.35% / 13.71%，当前使用纯色材质，后续皮肤贴图与烘焙前必须整理。
- `export-verification.json`：实际 GLB 重新导入 Blender，9 个蒙皮网格、22 根骨骼和 6 个动作均保留。
- `motion-verification.json`：6 个动作各 9 帧抽样，顶点有限、权重归一、每顶点最多 3 个骨骼影响；走跑 / 待机 / 挥手抽样鞋底误差小于 0.001。
- `walk-preview.mp4`、`wave-preview.mp4`：实际 Blender 三循环视频；对应 contact 图片为抽帧检查。补查坐姿、跑步、挥手的侧面与背面。
- `browser-verification.json`、`browser-review.png`：独立本地 Three.js 页面实际加载原始 GLB，6 个动作各采样 9 帧计算蒙皮顶点；6 个克隆有独立骨架，没有捕获到运行异常或 `console.error`。Three.js 按材质拆分鞋体，因此每实例显示 11 个 SkinnedMesh，与 glTF 的 9 个网格统计口径不同。这不是海湾联机、角色换装隔离、帧率或真实设备验证。

独立视觉复查允许进入开发预览，仍不标记正式可交付：袖口背面有不规则边缘，手腕留有小凹痕，新裤口的卷边细节较简化。网页的直接光下，脸部和头发表面比 Blender 软光渲染更硬；材质覆盖对照只在诊断预览中进行，没有改写生产源或作为最终通过证据。完整动作切换、坐下过渡、游戏中的椅子位置、外观功能及多人开销仍未验证。`game_ready:false`，尚未进入 `public/models/`，现有游戏人物和 Socket.IO 未修改。

追加抽帧复查未发现明显裤裆裂缝、关节崩坏或大面积穿衣；行走腿部较直、摆臂偏小，挥手幅度也较克制。视频已生成，但本次视觉检查使用抽帧，不能据此判定脚滑、速度匹配和循环接缝通过。浏览器截图保持角色身份，头发更深更亮、表面不平更明显；具体原因尚未隔离。剩余限制同时记录于 `joints-refined/known-limits.json`。

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
