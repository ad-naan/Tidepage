# 海湾美术资源

人物改用有明确授权的现成模型。此前自建模型未通过验收，已移出项目；目前游戏里的人物尚未替换。

## 视觉参考

- [卡通旅人参考](cartoon-traveler-reference.png)：生成的概念图，用于说明卡通比例和服装方向，不代表已完成模型。
- [海湾参考](bay-reference.png)：生成的概念图，用于说明海湾空间与材质方向，不代表已完成模型。

## 现成人物候选

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
