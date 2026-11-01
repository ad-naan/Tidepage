# 开发上手：从改一个页面开始

先看这一份就能开始。找不到文件时查 [目录说明](project-map.md)，遇到组件放置问题再查 [前端架构](frontend-architecture.md)。数据库和多人扩展不用一开始就学。

## 1. 启动项目

在项目目录打开 PowerShell：

```powershell
cd E:\26Project\adnaan-blog
node --version
npm ci
npm run dev
```

Node 应为 24.x。`npm ci` 只在第一次、依赖更新或依赖损坏时执行。日常启动只用 `npm run dev`。

打开终端显示的地址，通常是 `http://localhost:3000/zh-CN`；英文为 `/en`。终端保持运行，改文件并保存后浏览器会自动更新。按 `Ctrl+C` 停止。

**只改页面，不用安装数据库。** 无环境文件时默认用 demo 内容。如果已有 `.env` / `.env.local`，检查 `CONTENT_SOURCE`：只做演示开发设为 `demo`。修改环境配置后重启开发服务。

首次需要环境文件时，把 `.env.example` 复制为 `.env`；已有文件就编辑它，不要覆盖。

## 2. 第一次修改，先改首页介绍

1. 按 `Ctrl+P` 打开 `src/shared/i18n/messages/zh-CN.json`。
2. 找到 `home → hero → intro`。
3. 修改 `line2` 或 `description`，保留原来的 key 和 JSON 格式。
4. 打开 `en.json`，同步调整对应英文。两份 JSON 的 key 结构必须一致。
5. 保存，查看首页；再打开 `/en` 看英文。

这里控制文字。要改介绍区结构、链接排列、星芒彩蛋，打开 `src/modules/home/ui/HomeHero.tsx`；要改它的排版，打开旁边的 `HomeHero.module.css`。

姓名、头像路径、GitHub 等链接在 `src/shared/config/profile.ts`。个人介绍文字仍在语言包里。

## 3. 改现有页面，按这个顺序找

以一言页为例：

1. `src/modules/content/ui/quotes/QuotesView.tsx`：结构与交互。
2. 同目录 `QuotesView.module.css`：这一页的排版和样式。
3. 语言包的 `quotes`：标题、按钮、提示文字。
4. `demo-data.ts` / `demo-en.ts`：demo 模式下的一言内容，不是界面文案。
5. 保存后检查桌面、窄屏、英文和深色模式。

其他页面查 [页面对应表](project-map.md#页面在哪里)。通常不用先改 app 中的路由文件，也不要一上来就向 globals.css 添加覆盖规则。

### 调字体、字号和间距

只影响一个页面，改它旁边的 CSS Module。希望统一影响全站，改 `src/styles/tokens.css` 的公共变量。

```css
.section {
  display: grid;
  gap: var(--space-4);
  font-family: var(--font-ui);
  font-size: var(--text-body);
}
```

`--space-4` 是 16px，`--text-body` 是 14px。其他尺度见 [设计基础](design-system.md)。避免每页各自定义一套字号。

## 4. 使用已有基础组件

| 需要什么               | 导入位置                                    |
| ---------------------- | ------------------------------------------- |
| 按钮 / 图标按钮        | `@/shared/ui/button/Button`                 |
| 输入框、文件选择、滑块 | `@/shared/ui/field/Input`                   |
| 文本域                 | `@/shared/ui/field/Textarea`                |
| 选择器                 | `@/shared/ui/select/Select`                 |
| 分类筛选               | `@/shared/ui/filter-tabs/FilterTabs`        |
| 对话框                 | `@/shared/ui/dialog/Dialog`                 |
| 操作提醒               | `@/shared/ui/feedback/NoticeProvider`       |
| 站内链接、路由         | `@/shared/i18n/navigation`                  |
| 外部链接               | `@/shared/ui/link/Anchor` 的 `ExternalLink` |
| 铅笔线、纸边           | `@/shared/ui/drawing/CoastalMarks`          |

`Button` 默认 `bare` 外观，适合已有定制布局；新按钮可选 `variant="quiet"` 或 `"primary"`。`busy={saving}` 可禁用重复操作。表单提交按钮必须显式写 `type="submit"`。

输入框默认有统一外观；旧布局完全定制时用 `appearance="bare"`。控件原生属性和 ref 都可以传入，不要再包一层临时按钮或临时输入框。

## 5. 新增一个小页面：完整例子

以 `/zh-CN/playground` 为例。**这是开发示例，项目没有额外添加这个页面。** 按以下顺序创建，不需要先建数据库表，也不用创建一套空的后端目录。

### 第一步：给语言包增加文案

把 `playground` 作为一个新顶层属性加到现有 JSON 中，不要覆盖整个文件。

中文 `zh-CN.json`：

```json
{
  "playground": {
    "title": "创意小试验",
    "description": "把一个小想法，先做出来。",
    "action": "试一下",
    "done": "这个小交互已经生效"
  }
}
```

英文 `en.json`：

```json
{
  "playground": {
    "title": "Little experiments",
    "description": "Give a small idea a place to begin.",
    "action": "Try it",
    "done": "The interaction is working"
  }
}
```

示例外层的大括号表示 JSON 文件的根对象；实际编辑时只把新的属性合进去。注意前后属性之间的逗号，JSON 不支持注释或末尾多余逗号。

### 第二步：创建视图与样式

文件 `src/modules/playground/ui/PlaygroundView.tsx`：

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button/Button";
import { Text } from "@/shared/ui/typography/Text";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import styles from "./PlaygroundView.module.css";

export function PlaygroundView() {
  const t = useTranslations("playground");
  const { notify } = useNotice();
  return (
    <section className={styles.view}>
      <Text as="h1" variant="title">
        {t("title")}
      </Text>
      <Text as="p" tone="muted">
        {t("description")}
      </Text>
      <Button
        variant="quiet"
        onClick={() => notify({ title: t("done"), tone: "success" })}
      >
        {t("action")}
      </Button>
    </section>
  );
}
```

同目录创建 `PlaygroundView.module.css`：

```css
.view {
  display: grid;
  justify-items: start;
  gap: var(--space-4);
  padding-block: var(--space-6);
}
```

这里需要点击和 hook，所以文件开头有 `"use client"`。没有状态、浏览器操作或事件的服务端展示组件不必加。

### 第三步：创建网址入口

文件 `src/app/[locale]/(site)/playground/page.tsx`：

```tsx
import { getLocale, getTranslations } from "next-intl/server";
import { pageMetadata } from "@/server/seo/metadata";
import { PlaygroundView } from "@/modules/playground/ui/PlaygroundView";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("playground");
  return pageMetadata("/playground", t("title"), t("description"), locale);
}

export default function Page() {
  return <PlaygroundView />;
}
```

打开 `/zh-CN/playground`。放在 `(site)` 下的页面自动获得页头、页脚、语言和全局提醒。不要再在视图里重复加 SiteShell。

已有页面使用 `getPageMetadata("/quotes")` 等登记入口。新路径尚未登记时用上面的 `pageMetadata`，不要直接把新路径传给只接受已有路径的 `getPageMetadata`。

想加进菜单：在 `src/shared/config/site.ts` 的 `navigationItems` 添加 `{ href: "/playground", key: "playground" }`，并在各语言包的 `nav` 下补名称。默认进入“更多”；要成为主要栏目，再改 `SiteNavigation.tsx` 的 `primaryKeys`。准备正式索引时再登记 `publicPages`。

## 6. 改文章内容前，确认数据来源

| 配置                      | 来源                  | 改哪里                       |
| ------------------------- | --------------------- | ---------------------------- |
| `CONTENT_SOURCE=demo`     | 代码内演示数据        | `demo-data.ts`、`demo-en.ts` |
| `CONTENT_SOURCE=postgres` | PostgreSQL 已发布记录 | 数据库或后续的内容管理功能   |

正文在文章的 `sections` 中。网页、电影、代码内容块的演示在 `demo-blocks.ts`。参照现有记录修改，保留 slug、分类、日期等字段类型。

前台视图不要直接导入 demo 文件；路由仍调用 `modules/content/server` 取数据。数据库模式下改演示文件不会生效。

目前还没有内容管理后台，“预览登录”也不等于真实发布权限。

## 7. 需要存真实内容时，再接数据库

只改页面可以跳过这一节。

1. 安装并启动 Docker Desktop。
2. 复制 `.env.example` 为 `.env`，已有文件不要覆盖。设置本地 `POSTGRES_PASSWORD`。
3. 执行 `npm run infra:up`，等待 PostgreSQL 和 Redis 正常启动。
4. 取消 `.env` 中 `DATABASE_URL` 的注释，把连接串中的密码改成同一个本地密码。
5. 执行迁移；需要开发示例时才执行 seed。

```powershell
npm run db:migrate
npm run db:seed
```

6. 设置 `CONTENT_SOURCE=postgres`。需要缓存时再取消 `REDIS_URL` 的注释。
7. 停止并重启 `npm run dev`，查看文章页。

`npm run infra:down` 停止服务并保留数据卷。`.env.local` 会覆盖 Next 和数据库脚本的 `.env` 配置，但 Docker Compose 默认读取 `.env`。入门时建议把这些连接配置统一放在 `.env`，避免两份密码不一致。

数据库连接失败会报告错误，不会悄悄切回 demo。更多 API、数据表、缓存和多人扩展见 [后端开发](backend-development.md)。

## 8. 改完如何确认没坏

```powershell
npm run check
npm run build
```

`check` 验证代码格式、目录依赖、基础组件使用、类型和测试；`build` 验证生产构建。格式检查失败时执行 `npm run format`，也可用 `npm run format:check` 单独检查。VS Code 安装工作区推荐的 Prettier 扩展后，保存文件会按项目配置自动格式化。之后在浏览器亲自点一次修改过的功能，检查窄屏、英文和深色模式，自动检查不能判断排版是否好看。

架构报错 `use the shared UI primitive`：写了原生控件，改用统一组件。报错 `co-locate CSS Modules`：样式文件没有放到所属组件旁边。

## 9. 常见问题

| 现象                   | 先查什么                                                       |
| ---------------------- | -------------------------------------------------------------- |
| 改个人介绍没变化       | 是否改了 `home.hero.intro`？是不是被星芒切到了主题文案？       |
| 改文章没变化           | 当前是 demo 还是 postgres？是不是在看另一个语言？              |
| 中文正常、英文报错     | 两份 JSON 是否都有新增 key？运行 check 查看缺失项              |
| 不知道样式在哪         | 找视图旁的 `.module.css`；页头天空效果另在 `sky-header.css`    |
| 定制输入框突然有大边框 | 是否需要 `appearance="bare"`？                                 |
| 端口变成 3001          | 已有服务占用了 3000；看终端地址，不要反复启动多个服务          |
| 改环境配置没生效       | 重启 dev；检查 `.env.local` 是否覆盖 `.env`                    |
| 不知道要建多少目录     | 只有前端需求就只建 `ui`，不必提前建空的 domain、数据库和服务层 |

建议先完成“改首页介绍”，再亲手做一遍“新增小页面”。这两件事跑通后，再进入 API 和数据库开发。
