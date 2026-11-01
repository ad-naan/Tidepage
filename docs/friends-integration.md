# 友联模块实现与联调参考

本文仅是友联模块的专项参考。全站按模块推进的顺序和教学方式以 [模块开发路线](backend-roadmap.md) 为准；友联在内容、身份等依赖完成后再接入。

## 当前实现

访问 `/zh-CN/friends` 或 `/en/friends`；页头“更多”中有友联入口。沿用栏目编号、纸面名片、铅笔分隔、海岸小稿与页边注释，桌面为名片区加交换说明，窄屏上下排列。

- 路由：`src/app/[locale]/(site)/friends/page.tsx`，只装配数据、SEO 和视图。
- 视图：`src/modules/friends/ui/`，复用 ContentHeading、FilterTabs、Button、Dialog、Disclosure、ExternalLink、Notice 和手绘材料。
- 协议：`src/modules/friends/domain/models.ts`，定义分类、友站公开字段与目录返回类型。
- 数据入口：`src/modules/friends/server/index.ts`，当前明确返回 `preview: true`。四张名片来自语言包 `friends.samples`，使用保留的 `.example` 域名且不渲染外链，不代表真实互链。
- 本站名片：由语言包、profile.avatar 和服务端 SITE_URL 组装；上线前设置真实 SITE_URL，否则复制的仍是本地开发地址。
- 暂无在线申请或审核功能。交换弹窗提供站主公开 GitHub 主页入口，不虚构提交成功状态。

## 第一阶段：一起打通只读闭环

现有项目已经采用 Next Route Handler、PostgreSQL / Drizzle、统一 API envelope；先沿用这套基础设施。下面是待开发约定，不是已经存在的接口。

1. 启动环境：按 `onboarding.md` 配置本地 `.env`，运行 `pnpm run infra:up`，检查 `GET /api/v1/health/ready`。不要覆盖已有环境文件或对生产库试验。
2. 在 friends/application 定义 `FriendsRepository.listPublished(locale)` 和读取用例；在 friends/infrastructure 增加 Drizzle 表与 PostgreSQL 适配器，最后由 friends/server 组装。路由、UI 不直接访问数据库。
3. 建议表：`friend_links` 保存 id、url、category、status（draft / published / archived）、sort_order、created_at、updated_at；`friend_link_translations` 保存 friend_id、locale、name、description，以 (friend_id, locale) 为唯一键。先使用纸面符号作为头像，不引入远程图片加载。
4. 用现有 `db:generate` 生成 SQL 和快照，审查后执行 `db:migrate`。种子脚本幂等写入自己确认的真实友站，示意名片不导入数据库。
5. 增加 `GET /api/v1/friends?locale=zh-CN`，使用 localeSchema 校验；通过 defineRoute / jsonData 返回 `ApiResponse<FriendDirectory>`。正式数据必须 `preview: false`，只含 published 且有当前语言翻译的条目，按 sort_order、id 稳定排序；没有条目返回空数组，不能退回示意内容掩盖故障。
6. 页面调用同一个 server 读取用例，避免服务端 HTTP 自请求；需要浏览器刷新时再复用 apiGet。保留 FriendsView 的 props，替换数据入口即可完成首轮联调。

建议公开返回：

```json
{
  "data": {
    "items": [
      {
        "id": "friend-id",
        "name": "友站名称",
        "description": "一句话介绍",
        "url": "https://friend.example/",
        "category": "technology"
      }
    ],
    "preview": false
  },
  "meta": { "requestId": "request-id" }
}
```

验收：数据库新增、调整排序、归档分别能反映到列表；中英文按翻译读取；空分类显示空态；非法 locale 返回 400；数据库错误走统一错误管道；草稿与归档绝不出现在公开响应。为这些行为添加 repository/API 测试，运行 `pnpm run check` 和 `pnpm run build`。

## 第二阶段：站主维护，再开放访客申请

先实现登录和站主权限，再开发友联新增、编辑、发布、归档。写入接口使用 requirePrincipal、站主授权和 requireSameOrigin，不能只判断“已登录”。缓存等真实需要时再加，写入后失效。

公开申请单独建 `friend_applications`，不要让申请直接进入 published。建议字段 name、url、description、category、私有 contact、status（pending / approved / rejected）、created_at；公开列表永不包含联系方式或拒绝原因。通过审核后在事务中生成友站记录。

申请接口准备好之后，再用 shared Field/Input/Textarea/Select 组装申请表，接 apiSend，呈现真实 pending / error / success。先完成服务端校验、限流、同源检查和重复申请策略，再开启入口。初期不自动抓取申请 URL、favicon 或健康探测；如以后需要，单独设计网络访问边界。

## 与全站开发的关系

友联读取、管理和申请审核在全站路线推进到友联模块时逐项完成，复用前面完成的内容读取、真实身份与站主授权，不作为全站后端的起点。通用技术约定见 `docs/backend-development.md`。
