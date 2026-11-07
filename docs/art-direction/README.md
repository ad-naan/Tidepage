# 海湾与角色美术方向

当前方向是可爱、圆润、治愈的异世界小人。用户已接受现有角色，要求先接入开发，模型细节后续迭代。当前海湾场景仍沿用已有实现；本轮完成角色接入，不代表整片海湾美术已经完成。

## 当前使用的角色

- [游戏内实际画面](avatar-in-bay.png)
- [最终 Blender 模型预览](cartoon-avatar-polished-review.png)
- [制作源、导出方法、来源与限制](../../assets/characters/cozy-avatar/README.md)
- 网页模型：`public/models/avatars/cozy-avatar-v1.glb`
- 可编辑源：`assets/characters/cozy-avatar/cozy-avatar.blend`，贴图内嵌。

本地玩家、远端同行者及合照统一使用新模型。走、跑、跳、坐下、挥手由独立骨骼动画驱动，上衣可换色。旧版装扮协议和本机存档继续兼容；尚未具备的发型、配饰和捏脸控件已收起。

## 保留的设计参考

- `bay-reference.png`：海湾氛围目标，不是已经实现的场景截图。
- `cartoon-traveler-reference.png`：卡通人物方向。
- `cartoon-avatar-input-v2.png`：已制作角色的输入参考。
- `cartoon-avatar-female-input-v2.png`：女孩方向参考，尚未制作成可用角色。

## 验证范围

最终资产为 34,920 三角面、22 根骨骼、6 个动作；制作阶段的几何、动作数值与导出复查快照保存在角色目录的 `qa/` 中。运行时测试验证独立骨骼、衣色、共享资源生命周期、加载失败重试，以及实际 Socket.IO 双人移动和动作同步。

这仍是开发版本。坐下过程、脚步滑动、头发与脸部材质、更多角色和捏脸继续迭代；尚未做 12 人满房及低端手机性能验收。当前 `tidal-sanctuary.glb` 不在项目中，海湾使用既有程序场景回退；本轮没有把缺失场景声称为已完成。

## 清理约定

按用户要求，已把唯一在用的角色源与必要检查记录移到 `assets/characters/cozy-avatar/`。旧版模型、废弃试验、重复 GLB、下载缓存、临时浏览器目录与中途渲染不再长期保留。Blender 程序和项目当前使用的资产保留。清理明细见角色目录内的 `cleanup.json`。
