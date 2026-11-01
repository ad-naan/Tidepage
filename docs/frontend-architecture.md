# 前端目录与组件约定

`src/components` 已移除。不要把所有 React 组件都搬进 `shared/ui`：能复用不代表没有业务含义。下面按职责和依赖方向放置。

```text
src/
  app/                           Next 路由、请求参数、数据读取、metadata、布局组合
  widgets/
    site-shell/
      SiteShell.tsx              组合站点页头、页脚与阅读模式
      header/                    SiteHeader、HeaderBrand、HeaderSky、ActivityDetails
      navigation/                站点导航及内容预览
      footer/                    页脚、偏好组合、访客统计
      reading/                   页头阅读进度
  modules/
    home/ui/                     HomeView、HomeHero、Journey、ProfileLinks
    content/
      domain/ application/ infrastructure/ server/
      ui/
        articles/                ArticlesView、ArticleDetail、ArticleList、内容块与目录
        notes/ projects/ quotes/ 各自的 View 与配套样式
        gallery/ about/           GalleryView、AboutView
        layout/                  ContentHeading：内容栏目专用标题
    media/ui/player/             音乐播放器、唱片与唱臂
    engagement/ui/               评论、手记回应、阅读批注
    identity/ui/                 身份预览与登录展示
    friends/domain/ server/ ui/   友联协议、数据入口、友站名片与交换说明
    world/                       海岸插画、交互世界、运行时与玩法规则
  shared/
    ui/                          无业务含义的基础组件
    hooks/ lib/ contracts/       公共行为、工具、跨边界协议
    i18n/ config/ http/          多语言、公共配置、HTTP 客户端
  server/                        数据库、缓存、HTTP、SEO 等服务端基础设施
  styles/                        根布局引入的主题、变量与站点公共基线
```

依赖方向：`app → widgets → modules → shared`。路由也可直接组合模块。业务模块之间可引用明确的 `domain`、`ui` 或 `server` 出口，不允许引用对方的持久化内部实现。`modules` 不能反过来引用 `widgets` 或 `app`；`shared` 不能引用业务模块；客户端不能通过间接导入接触服务端基础设施。

## 基础组件清单

| 能力          | 统一入口                                          | 负责内容                                                                                          |
| ------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 操作按钮      | `shared/ui/button/Button`                         | Button、IconButton；默认 button 类型、busy/disabled、焦点、按压动效、原生属性与 ref               |
| 表单输入      | `shared/ui/field/Input`、`Textarea`、`Field`      | Input、FileInput、RangeSlider、Textarea；输入语义、键盘焦点、无效与禁用状态，Field 组合标签和说明 |
| 可见文件选择  | `shared/ui/field/UploadField`                     | 统一按钮与隐藏文件输入；业务层负责文件处理、进度与取消，不能直接显示浏览器默认文件控件            |
| 日期与时间    | `shared/ui/date-picker/DatePicker`                | 日历、方向键跨月、确认 / 清除、可选小时与分钟；不使用可见原生日期控件                             |
| 路由链接      | `shared/i18n/navigation`                          | 保留 locale、路由 loading 生命周期                                                                |
| 普通/外部链接 | `shared/ui/link/Anchor`                           | Anchor 用于页内、邮件等；ExternalLink 统一新标签页的安全 rel                                      |
| 选择器        | `shared/ui/select/Select`                         | Radix 仅在内部使用；Portal、键盘、typeahead、选中态与 busy                                        |
| 分类筛选      | `shared/ui/filter-tabs/FilterTabs`                | pressed 按钮组、方向键定位、手绘选中态；不伪装成没有 tabpanel 的 ARIA tabs                        |
| 对话框        | `shared/ui/dialog/Dialog`                         | native dialog 的焦点约束、Escape、背景点击、关闭后焦点恢复、纸边外观                              |
| 锚点浮层      | `shared/ui/overlay/AnchoredPanel`、`OverlayScope` | Portal、定位、边界、焦点和嵌套归属；开关行为复用 useDisclosure                                    |
| 展开内容      | `shared/ui/disclosure/Disclosure`                 | 原生 details/summary 语义与焦点                                                                   |
| 操作提醒      | `shared/ui/feedback/NoticeProvider`               | notify、页面信息、读屏播报、消失/暂停/替换规则                                                    |
| 文字与数值    | `shared/ui/typography`                            | Text 的语义字号；AnimatedNumber 的数字过渡                                                        |
| 手绘材料      | `shared/ui/drawing`、`illustration`               | 铅笔滤镜、选中笔迹、纸边、潮痕、贝壳等符号与海岸小稿                                              |
| 全局导航反馈  | `shared/ui/navigation/NavigationFeedback`         | 路由加载、随机文案、页面高度和页脚稳定                                                            |
| 站点偏好      | `shared/ui/preferences`                           | 语言与主题控件；状态仍由路由 / SiteShell 持有                                                     |
| 滚动条        | `shared/ui/scroll-area/CustomScrollbars`          | 公共滚动区域与刷新通知                                                                            |

这是**当前站点使用到的基础交互清单**。以后出现日期选择、复杂表格、拖拽上传等需求，应先在这里增加对应基础组件，再供业务使用；不要为了清单完整提前制造无用途的组件。

## 放置与命名

- 基础组件用语义命名，如 `Button`，不叫 `SpringButton`；动效是实现细节。组合组件用业务职责命名，如 `SiteShell`、`ArticleDetail`、`ContentHeading`。
- 视图入口统一 `*View`，文章详情使用 `ArticleDetail`；同域子组件靠近入口。文件与导出名对应，CSS Module 与组件同名并放在一起。
- `ContentHeading` 包含栏目编号、栏目文案和插画映射，是内容模块组件；它使用 `Text` 与手绘基础材料，但自身不进入 `shared/ui`。
- `CoastalVignette` 仅接收图案类型，不读取文章或栏目，是可共享的视觉材料。海岸玩法与水獭交互放在 `world`。
- 跨目录使用 `@/` 路径；同目录可用 `./`。服务端模块通过 `modules/<name>/server` 入口暴露。不要创建混合全部客户端、服务端导出的总 barrel。
- 路由负责校验、请求和 SEO，再把数据交给视图。页面视觉放到对应模块，不在路由文件堆控件实现。
- 文案放独立语言 JSON，通过稳定 key 取值；新增语言补齐词典。禁止在 JSX 中根据 locale 使用二选一文案。
- 基础组件保留原生语义和完整属性，业务回调、数据、权限、文件验证留在模块。不要把每个 `div`、`p` 都机械包成组件。

## 使用例子

```tsx
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Input } from "@/shared/ui/field/Input";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";

<Button variant="primary" busy={saving} onClick={save}>{t("save")}</Button>
<IconButton aria-label={t("close")} onClick={close}><X size={16}/></IconButton>
<Input id="name" aria-label={t("name")} value={name} onChange={change}/>
<FilterTabs label={t("filter")} options={options} value={value} onChange={setValue}/>
```

既有插画热区、播放器与高度定制布局使用 `Button` 的 `bare` 外观或 `Input` 的 `appearance="bare"`：控件行为统一，业务视觉不被统一的大按钮覆盖。表单中的提交按钮必须显式 `type="submit"`。文件与滑块分别使用 `FileInput`、`RangeSlider`，不混用文本输入外观。

## 自动执行

`npm run check:architecture` 会检查分层、客户端/服务端依赖、旧目录，以及原生控件的归属。业务和组合层不能直接写 `button`、`motion.button`、`input`、`textarea`、`select`、`a`、`dialog`、`details/summary`，必须使用统一出口。原生标签只允许出现在它自己的基础实现中；不能另建一个“临时基础组件”绕过检查。

`tests/ui-architecture.test.mjs` 使用合法与违规样例验证这些规则。`npm run check` 执行格式、架构、类型和测试；生产构建另执行 `npm run build`。字体、间距与笔触见 [设计基础](design-system.md)。
