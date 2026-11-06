# 海湾美术资源

人物改用有明确授权的现成模型。此前自建模型未通过验收，已移出项目；目前游戏里的人物尚未替换。

## 当前方向（2026-11-07）

用户明确要求：免费、治愈系、真正的卡通小人，男女都有。已否定 Snow / Rain、QUBITS 以及后续带写实脸部结构的人物。停止这些候选的适配，不能再将其推荐或接入。

筛选标准：圆头短身、简化可爱的五官、柔和玩具质感、低饱和色、日常服装，适合海湾散步与陪伴。以《动物森友会》式的抽象程度作为比例与五官方向参考，不使用该游戏的提取资产。排除真实鼻梁、厚嘴唇、成人脸部结构、皮肤写实质感；排除盔甲武器和战斗英雄造型；排除付费包。仅仅标为 stylized、chibi 或 cartoon 不代表外观合格。

目前尚未选定符合这些要求的免费成套资产。先核对作者实图和授权，再做适配；不能拿概念图冒充可下载模型，也不能为了免费而降低外观要求。以下付费条目仅保留为淘汰记录。

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
