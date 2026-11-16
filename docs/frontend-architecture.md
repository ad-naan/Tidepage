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
      footer/                    页脚、偏好组合
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
    engagement/ui/               评论、手记回应、阅读引用
    identity/ui/                 身份预览与登录展示
    friends/domain/ ui/           友联工作副本与交换说明
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

| 能力          | 统一入口                                                | 负责内容                                                                                          |
| ------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 操作按钮      | `shared/ui/button/Button`                               | Button、IconButton；默认 button 类型、busy/disabled、焦点、按压动效、原生属性与 ref               |
| 表单输入      | `shared/ui/field/Input`、`Textarea`、`Field`            | Input、FileInput、RangeSlider、Textarea；输入语义、键盘焦点、无效与禁用状态，Field 组合标签和说明 |
| 可见文件选择  | `shared/ui/field/UploadField`                           | 统一按钮与隐藏文件输入；业务层负责文件处理、进度与取消，不能直接显示浏览器默认文件控件            |
| 日期与时间    | `shared/ui/date-picker/DatePicker`                      | 日历、方向键跨月、确认 / 清除、可选小时与分钟；不使用可见原生日期控件                             |
| 日期展示      | `shared/lib/date-time`、`shared/ui/typography/DateTime` | 统一时区、绝对日期、近期相对时间、完整时间提示与共享刷新时钟；业务视图不自行拼接日期格式          |
| 路由链接      | `shared/i18n/navigation`                                | 保留 locale、路由 loading 生命周期                                                                |
| 普通/外部链接 | `shared/ui/link/Anchor`                                 | Anchor 用于页内、邮件等；ExternalLink 统一新标签页的安全 rel                                      |
| 选择器        | `shared/ui/select/Select`                               | Radix 仅在内部使用；Portal、键盘、typeahead、选中态与 busy                                        |
| 分类筛选      | `shared/ui/filter-tabs/FilterTabs`                      | pressed 按钮组、方向键定位、手绘选中态；不伪装成没有 tabpanel 的 ARIA tabs                        |
| 对话框        | `shared/ui/dialog/Dialog`                               | native dialog 的焦点约束、Escape、背景点击、关闭后焦点恢复、纸边外观                              |
| 锚点浮层      | `shared/ui/overlay/AnchoredPanel`、`OverlayScope`       | Portal、定位、边界、焦点和嵌套归属；开关行为复用 useDisclosure                                    |
| 展开内容      | `shared/ui/disclosure/Disclosure`                       | 原生 details/summary 语义与焦点                                                                   |
| 操作提醒      | `shared/ui/feedback/NoticeProvider`                     | notify、页面信息、读屏播报、消失/暂停/替换规则                                                    |
| 文字与数值    | `shared/ui/typography`                                  | Text 的语义字号；AnimatedNumber 的数字过渡                                                        |
| 手绘材料      | `shared/ui/drawing`、`illustration`                     | 铅笔滤镜、选中笔迹、纸边、潮痕、贝壳等符号与海岸小稿                                              |
| 全局导航反馈  | `shared/ui/navigation/NavigationFeedback`               | 公开页面正文占位、工作台顶部进度提示                                                              |
| 内容加载占位  | `shared/ui/loading/LoadingSkeleton`                     | 页面 / 列表 / 正文 / 卡片骨架；延迟显现、降低动态效果、延迟读屏播报，避免短请求闪字               |
| 站点偏好      | `shared/ui/preferences`                                 | 语言与主题控件；状态仍由路由 / SiteShell 持有                                                     |
| 滚动条        | `shared/ui/scroll-area/CustomScrollbars`                | 公共滚动区域与刷新通知                                                                            |

编辑器选区工具条通过 `AssistantCommand` 展开紧凑的 AI 指令栏；提交后，`InlineAssistant` 用 `AssistantWorkspace` 的临时 decoration 在对应顶层块之后展开审阅区。无选区时直接在当前段落下方输入。工作区与选区高亮不进入文档 JSON、历史或发布内容；写作与画图状态分别留在 AI / 内容模块，只有明确采纳才修改正文。`Dialog` 的 `workspace` 布局和 `footer` 插槽用于预览、设置独立滚动且确认操作常驻的编辑窗口。滚动条只在显式宿主增减时重新收集；尺寸由 ResizeObserver 跟踪，宿主移除、隐藏或进入关闭状态时在下一次绘制前隐藏对应浮轨，避免流式文字触发整页重复扫描。

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

## 跨内容互动与手记阅读

评论属于 `modules/engagement`，由 `ui/Discussion` 提供公共入口。文章、手记、项目和自述分别传入 `{ type: "article" | "note" | "project" | "page", id }`；组件从当前语言环境读取 locale。更换评论对象会重置列表、回复对象和草稿，取消旧的读取请求。

`server` 提供评论存储与对象可见性校验，`/api/v1/comments` 统一提供读取、游标分页和登录后发表。讨论串由内容类型、ID、locale 共同确定；回复外键也包含这三个字段。公开响应只返回显示名称，不暴露账号 ID。新增可评论页面时，同时在服务端对象校验中登记页面 ID。

点赞和收藏由同一模块的 `EngagementProvider`、`EngagementActions` 与 `/api/v1/interactions` 提供。按内容类型、ID、locale、账号、互动类型建立唯一记录；写入使用明确的 active 状态，重复请求不会重复计数。公开读取点赞总数，仅返回当前账号的点赞和收藏状态，收藏关系不公开。列表批量读取状态；卡片和阅读窗口共享同一 Provider。登录、同源校验、对象可见性和限流在服务端执行，浏览器不持久化互动记录。

手记的 `images` 是独立有序的图片数组，每项包含 assetId、alt、caption，与正文分别保存。卡片显示第一张作为封面，`NoteReader` 直接读取这个相册并原样呈现正文，不从富文本提取、移除或自动迁移图片。后台 `NoteImagesEditor` 支持多图上传、媒体库选择、排序和移除；工作副本按 locale 保存图片数组。发布接口读取已保存版本，校验版本、内容与媒体归属，再将独立图片和正文写入公开手记。

`Dialog` 的 `split` 布局负责宽幅容器；桌面正文独立滚动，窄屏在同一滚动区域上图下文。

交互文案位于语言目录的 `comments`、`engagement`、`notes.reader`、`admin.noteImages`。互动复用 IdentityProvider；访客发言、点赞和收藏需要配置现有 GitHub/Gitee OAuth 登录。

## 内容标签

文章保留单一固定分类和多个标签，手记保留一个主题标签。`content/domain/tags` 统一显示文本、大小写无关的标签标识、中英文逗号解析和链接生成；发布时做 NFKC、空白与前置井号清理并按标识去重。SQL 查询应用同样的规范，因此旧记录无需迁移即可精确筛选。

文章和手记工具栏复用 `content/ui/tags/TagFilter`，用共享 AnchoredPanel 与 useDisclosure 提供紧凑的可搜索入口、当前选择和清除，支持 Escape、外部点击和焦点恢复。标签查询仅统计当前语言已到发布时间的公开内容，按引用内容数排序，每次最多返回 20 项；输入搜索词后在服务端查找，页面不加载完整标签库。分类、标签与关键词可组合，改变筛选重置页码。后台 TagEditor 复用公开标签建议，文章列表最多显示三个标签及剩余数量，详情保留完整标签。

## 共用正文

正文手绘小图沿用同一契约与渲染链路：无业务含义的数据和 SVG 在 `shared/contracts/diagram.ts`、`shared/ui/drawing/MiniDiagram`，编辑适配位于 `modules/content/ui/admin/editor`。目录、国际化、AI 与保存方式见 [正文手绘小图](mini-diagrams.md)。

业务无关的正文节点、标记、链接和校验定义位于 `shared/contracts/rich-text.ts`，领域层直接使用这个契约。文章元数据、站点设置与评论规则分别留在各自 domain；评论的精简块白名单位于 engagement/domain/comment-document.ts。UI 层复用 content/ui/rich-text 的渲染器，后台完整编辑器与评论精简编辑器使用相同标记定义。不要在每个页面重新写正文 CSS 或只读编辑器来充当阅读预览。

站外 HTTP(S) 链接统一由 SiteShell 中的 `ExternalLinkPreview` 代理悬停和键盘聚焦，一次只挂载一个预览浮层。`ExternalLink` 可通过 `preview` 补充已有元数据；正文 ReadingLink、引用卡和其他外链复用这个入口。元数据在交互后请求，服务端校验公共地址、固定 DNS 结果、逐跳校验重定向，并限制大小、耗时、并发和缓存。抓取失败回退到链接文本与域名，不影响原链接打开。弹窗内预览挂到当前 dialog，Escape 优先关闭预览。

若系统 DNS 对某个域名只返回 `198.18.0.0/15` 的代理 Fake-IP，服务端通过固定的阿里公共 DNS HTTPS 接口获取真实 A 记录，失败后尝试 Cloudflare；只发送域名，不发送网页路径或查询参数。真实地址仍通过公共 IP 校验并固定到 HTTPS 连接，内网、混合地址和直接填写的 Fake-IP 仍被拒绝。正常公网解析不调用额外 DNS 服务。HTML 按头部流式读取，支持压缩与声明的字符集，读取到 `</head>` 即停止；封面校验失败保留已经抓到的标题和摘要。失败短暂缓存并记录不含 URL 的原因码，避免把网络故障长期伪装成成功预览。

评论区用 `useNearViewport` 接近视口时才挂载，复用原有游标分页；编辑器在开始输入、回复或引用时加载。正文代码高亮在接近视口时加载，原文保持可读、可复制。手记点击后立即打开阅读窗口，正文组件与数据并行按需加载，等待时复用封面并在正文区域显示骨架；关闭窗口取消请求，失败在窗口内重试。手记、项目、相册和一言收藏通过 `ProgressiveList` 限制初始挂载数，筛选变化重置批次。该组件只控制挂载数量，不替代服务端分页；文章保留原有服务端分页。

照片、正文图片和媒体缩略图共用 `shared/ui/image`。首屏主图可以提高请求优先级，其余图片用浏览器原生懒加载。内容区域提前保留图片比例；正文尺寸从媒体库批量读取，旧文件缺少尺寸时先用保守的占位比例。传入 `sizes` 的本地上传图片按实际宽度请求缩图，缩图失败时回退到原图。查看器在原图解码时可复用当前照片的缩图，缩放使用原图；外部地址和 GIF 保持直接加载。

## 桌面、旅途手账与文章补记

首页由 `HomeHero`、`HomeNotes` 与 `ArticleList` 保留原有海岸插画和两栏内容结构。`HeroSketch` 管理插画热区；`HeroOtter` 在固定挂载的透明 WebP 精灵图内切换挥爪帧，加载完成前保留静帧，保留原 GIF 的逐帧时长，重复点击从头播放，卸载时清理计时器。减少动态效果时只显示挥爪静帧。共享 `useThemePreference` 负责主题设置。水獭的静帧、精灵图和生成源 GIF 均在静态资源清单注册。

`ContentHeading` 的页眉线稿由同目录 `InteractiveHeadingSketch` 提供可选局部彩蛋，复用共享 Button；只有手记、项目、一言、相册启用。重播仅重建图层，不重建聚焦按钮；一次恢复计时在重新触发和卸载时清理。位移与静态减少动态效果分支都在同目录 CSS Module，动作名称登记在 `easterEggs` 语言目录。

`modules/journal` 管理读者主动保存的本机阅读书签和摘录，由 `SiteShell` 提供上下文；独立 `/journal` 路由组合 `JournalView`，文章与页脚通过 `JournalLink` 进入。它与需要登录的账号收藏分别存储，不改变账号互动计数。记录有版本、语言、数量上限和站内链接白名单，写入成功才显示保存状态，重复书签更新章节，满额不会自动丢弃旧条目。读取状态区分加载、空白和存储不可用；失败不会显示为空记录。当前版本不做跨设备同步。业务无关的文具线稿由 `shared/ui/illustration/StationeryDrawing` 提供，页面构图与浏览状态留在所属业务视图。

文章翻译的可选 `afterword` 包含作者批注与带日期的补记，通过既有草稿、导入、翻译、发布链路写入 publication JSON，不新增数据库列。空白补记允许暂存、阻止发布；公开视图只显示有内容的部分，后台预览复用 `ArticleAfterword`。

## 自动执行

`pnpm run check:architecture` 会检查分层、客户端/服务端依赖、旧目录，以及原生控件的归属。业务和组合层不能直接写 `button`、`motion.button`、`input`、`textarea`、`select`、`a`、`dialog`、`details/summary`，必须使用统一出口。原生标签只允许出现在它自己的基础实现中；不能另建一个“临时基础组件”绕过检查。

`tests/ui-architecture.test.mjs` 使用合法与违规样例验证这些规则。`pnpm run check` 执行格式、架构、类型和测试；生产构建另执行 `pnpm run build`。字体、间距与笔触见 [设计基础](design-system.md)。

## 页面背景与动效偏好

`widgets/site-shell/SiteAtmosphere` 组合低对比度光雾层与 `SeasonalMatter` 四季飘落层，属于站点构图，不进入业务模块。`shared/lib/seasonal-atmosphere` 复用站点日期工具按上海时区计算季节与晨昏，组件订阅现有的共享分钟时钟。形状由 `shared/ui/drawing/CoastalMarks` 提供：枫叶、银杏、橡树叶、桦叶、柳叶、花瓣与雪花；站点组合按季节选择形状与密度，共享绘画组件不读取时钟或季节。SiteShell 在海岸漫游外挂载，并在文章与专注阅读时减淡。背景层不接收指针事件、不进入无障碍树；桌面指针用被动监听驱动有上限的光雾视差与邻近叶片偏转，不绘制随机曲线或点击反馈。

`shared/ui/preferences/useBackgroundMotion` 保存本机缓动 / 静止选择，页脚复用 FilterTabs；初始服务端画面保持静止，挂载后再按本机选择、页面可见性与系统动效偏好启动。漂移、下落与翻转使用 CSS transform；叶片偏转的 RAF 在回落后停止。暂停取消 RAF、冻结 CSS 动画，卸载清理事件；减少动态效果保留静态形状，高对比度隐藏装饰。文案位于 `footer.preferences`。
