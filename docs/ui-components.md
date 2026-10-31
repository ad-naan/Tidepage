# 基础交互组件约定

基础组件位于 `src/shared/ui`，不依赖业务模块。组件负责外观、无障碍语义、焦点和交互边界；语言、业务数据与路由由调用者提供。

## 选择器

`Select<Value>` 基于 Radix Select，统一处理键盘、输入首字母查找、触屏、滚动、焦点恢复与边界定位。`value` 是调用者的真实值，`options` 提供稳定 ID 和显示名称；选中态不等于悬停态。浮层通过 Portal 渲染，避免被页头的裁切与动画容器遮挡。

```tsx
<Select
  value={value}
  options={options}
  onValueChange={setValue}
  label={t("fieldLabel")}
  variant="surface"
  disabled={disabled}
  busy={saving}
  describedBy="field-help"
/>
```

`surface` 用于表单，`ghost` 用于工具栏。支持 `required`、`invalid`、`name`、`dir`、图标、说明与禁用选项；`busy` 时禁用重复操作。所有可见标签由调用者翻译，基础选择器不判断当前语言。

## 浮层与关闭事件

页面中有可展开面板时，用 `OverlayScope owner="…"` 标识归属。它的子选择器即使被 Portal 移到 body，仍通过归属标记被视为面板内部交互。`useDisclosure` 不会因为用户点选这个浮层而关闭其父面板，已处理的 Escape 也不会重复触发父面板关闭。

组件内部的布局刷新使用专用通知。禁止以合成的全局 `resize` 代替局部刷新：第三方浮层会把它当成真实窗口变化并关闭，Motion 也会重新测量布局。自定义滚动条现在使用 `tidepage:scrollbars-refresh` 内部通知。

## 多语言切换

`LanguageSwitcher` 只组装 Select、语言注册表和路由。它保留路径、查询参数及锚点，在导航过程中显示忙碌状态。实际 locale 由 `[locale]` 路由布局传入的 Provider 决定，不能保留在不随语言路由更新的根布局里。`DocumentLanguage` 同步持久根元素的 `lang` 与 `dir`。

增加语言时：

1. 在 `src/shared/i18n/config.ts` 的 `localeRegistry` 注册名称、hreflang、Open Graph locale 和阅读方向。
2. 添加独立 JSON 词典，在 `src/i18n/catalogs.ts` 注册加载函数；编译器与测试检查词条结构。
3. 发布带对应 locale 的内容。相同 slug 的不同语言是独立记录，缺失翻译不冒充已有正文。
4. 运行 `npm run check`，检查页面切换、选中态、文本方向与 SEO 替代链接。

不在组件中添加按语言二选一的内嵌表达式。接口、缓存、内容主键和 SEO 均携带 locale；扩展语言不需要复制业务组件。

## 插画与播放器

海岸插画位于 `modules/world/ui/CoastIllustration`，其入口是场景内的纸船。配色与交互采用局部 CSS 模块，新增文字进入 `sketch` 词典。水波、许愿流星与登船动画遵循系统减弱动态设置；纸船和天空彩蛋保留键盘入口。

`RecordDeck` 把黑胶与唱臂放进同一比例坐标系，避免窄屏时唱头偏离。播放时唱头落在唱片标签之外、盘边之内；暂停时回到右侧支架。盘面沿用原有黑胶样式。

## 页面布局与字体

`styles/layout.css` 管理全站共用版心与字体。`--site-content-max`、`--site-gutter` 和 `--site-content-width` 同时用于首页、所有内页、页头与页脚；栏目组件不再自设更窄的外层宽度。正文长文在共享外框内保留约 800px 阅读列，目录沿外框右侧对齐。宽屏卡片增加列数，避免随版心放大而失去紧凑比例。

`SiteNavigation` 在桌面显示文章、手记、项目和更多；Logo 承担首页入口，次要栏目进入局部浮层。窄屏使用明确的浏览入口，不增加第二行页头。`HanddrawnMark` 用 SVG 曲线和回锋表达选中态与悬停态，禁止改回普通矩形直线。`HeaderBrand` 同时保留签名和头像节点，使用透明度与 transform 过渡，避免等待旧节点卸载后再显示新节点。默认态显示签名与一句状态；收拢态显示用户指定的 GitHub 头像及贴角状态光点，活动入口不使用水獭头像。头像位于 `public/images/author-avatar.png`，从用户提供的 `https://avatars.githubusercontent.com/u/163977012?s=60&v=4` 保存，不依赖运行时远程加载。

`RoomHeading` 是紧凑的栏目栏，序号、栏目名、标题、说明和小幅线稿在同一行内组成层级。禁止重新加入整块居中图标与大标题。`rooms.module.css` 只管理内页的密度与内容布局，不影响首页。

界面与正文使用本地托管的 `@fontsource-variable/noto-sans-sc`，按 Unicode 范围加载字体子集。正文为 400，栏目与内容标题为 500；不对正文施加 300 字重或手写字体。手写字保留在品牌与少量场景装饰中。新增其他文字系统时，在全局字体栈中补充对应的本地字体，组件内不判断语言。

## 导航与全局 Loading

`shared/ui/navigation/NavigationFeedback` 挂在 locale 布局上方，语言切换不会重置过场。统一的 `shared/i18n/navigation` 出口为 Link 和程序式路由提供生命周期反馈。路由的 `loading.tsx` 通过 `RouteLoading` 持有加载状态；完成后保留短暂淡出，减弱动态模式不加最短展示时间。

Loading 开始前保留正文高度，加载时隐藏页脚，避免正文被 fallback 替换后页脚跳到首屏。随机短句来自各语言的 `navigationLoading` 词典，同一会话不连续选择同一句。锚点跳转不属于整页导航。

阅读页头的 `ReadingProgress` 根据 `.prose` 范围测量阅读进度，评论区和页脚不延长进度。返回圆钮承载细圆环，辅助文字使用本地化百分比。

## 文章内容块

`modules/content/domain/blocks.ts` 定义可判别的内容类型，目前支持：

- `link`：网址、标题、摘要、站点名与可选图片。可展开摘要，并独立访问原站。
- `movie`：片名、原名、年份、导演、推荐说明、来源链接与可选配图。
- `callout`：提示或引用说明。
- `code`：代码、语言与说明，可复制并反馈成功或失败。

内容块存放在 section 的可选 `blocks` 数组中，与段落一起存入 PostgreSQL 的 sections JSONB。旧正文无需迁移，API 列表摘要仍不包含正文。`ArticleBlocks` 使用 React 渲染已验证的结构，禁止直接注入任意 HTML。链接限 HTTP(S)，外部图片限 HTTPS；Markdown 发布端输出相同的引用和代码。

示例见 `infrastructure/demo-blocks.ts`，使用 locale 注册表映射各语言正文数据。网站卡片使用作者提供、发布时保存的元数据；当前没有任意 URL 抓取接口，也不承诺每个外站都允许 iframe 嵌入。未来的编辑器和 Agent 应写入同一 schema，元数据抓取放在服务端发布流程中，做好目标主机、重定向、超时和缓存边界。

## 首页介绍与主题彩蛋

`HomeHero` 默认显示简洁的个人介绍。问候旁的星芒按钮在 `intro` 和 `theme` 之间切换，插画的日月许愿通过可选 `onWish` 回调揭示主题。离开后重新打开首页仍先展示介绍，不自动轮播。

两套文字使用同一网格区域预留实际所需高度，以透明度、轻微位移和模糊过渡，主题下划线随后描出。隐藏文案设置 `aria-hidden` 和延迟的 `visibility`，避免读屏或复制读取重复标题。按钮支持 Enter/Space，状态通过 `aria-pressed` 表达；系统减弱动态时即时切换。

所有文案位于各语言词典的 `home.hero`，按内容状态取值，不在 JSX 内对语言做二选一判断。介绍内容应保持简短，不补写未经确认的工作、所在地等个人事实。

## 天空页头与页脚偏好

`HeaderSky` 与 `styles/sky-header.css` 管理装饰层：默认 `is-resting` 状态的底色柔和淡出，与页面融合，不绘制边界或投影；滚动超过阈值进入 `is-compact` 后，宽度收至最多 1080px；SVG 用完整封闭曲线定义上沿、两端和下沿，模糊的渐变填色与 22px 背景柔焦共用同一轮廓，不能退回矩形、胶囊或仅下沿裁切。内容区保留独立内边距，右侧操作必须落在可见轮廓内。白天的小太阳向铅笔岸线落下，夜间月亮升起，系统减弱动态时直接切换。展开搜索、音乐或活动面板不会自行触发滚动阴影。昼夜配色使用 CSS 变量，装饰不响应指针，减弱动态偏好会取消阴影过渡。

作者活动保留在页头；`FooterPresence` 承载访客人数和统计浮层，沿用明确标记的演示数据。`FooterPreferences` 组合基础 `LanguageSwitcher` 和 `ThemeToggle`，语言从注册表读取，主题状态由 Shell 持有，控件不另建状态副本。语言选择器使用 Portal，页脚不会裁切选项；切换语言保留路径、查询与锚点。

## 页头独立浮层

`shared/ui/AnchoredPanel` 使用 Portal 将浮层与触发区的布局分开，负责视口边界、窄屏宽度、可视视口变化、滚动定位、减弱动态与关闭后的焦点归还。可选 `boundary` 使浮层避开整个工具栏，包括窄屏第二行导航。浮层继承 `OverlayScope` 所属标记，`useDisclosure` 继续处理外部点击、Escape、路由关闭和浮层互斥。

`SiteHeader` 的 `surfaces` 映射为活动、搜索和音乐各自指定入口、宽度与对齐方式；打开它们不改变 header 的尺寸或滚动形态。搜索输入自动获得焦点，音乐仍保留单一音频实例和播放状态。不要把浮层内容重新放回 header 高度动画，也不要给全局 `nav` 标签施加侧栏的间距规则。

## 页头定位与页脚布局

`header-slot` 固定在视口上，Shell 按 `--site-header-height` 保留相同顶部空间。Radix Select 打开时会锁定 body 的滚动，不能使用依赖 body 滚动参照的 sticky 页头，否则滚动到底部打开语言菜单会让页头移出视口。不要移除选择器的滚动锁来掩盖定位问题。

`SiteFooter` 单独封装签名、版权、联系入口与偏好工具，使用同一版心和手绘岸线；窄屏分成清晰的两行。返回海岸是页脚内联入口，不再使用覆盖控件的固定按钮。`ThemeToggle` 使用私有 CSS Module，按内容占宽，不能重新使用旧的全局 `theme-toggle` 类名（它为图标按钮固定了 29px 宽度）。

栏目模块规则显式提高自身作用域，避免旧全局 `.inner-page .article-row` 等规则因 CSS 分块加载顺序覆盖紧凑排版。

## 有内容的导航预览与铅笔材质

桌面导航经过 200ms 悬停意图延迟后展示局部内容卡片，离开后保留 180ms 跨越间隙时间；鼠标进入卡片会取消关闭。按向下键可打开对应预览并进入链接，Escape 关闭；触屏仍直接导航或点击浏览入口。内容由 locale 站点布局并行读取文章、手记与项目，通过 `NavigationOverview` 传递最新手记摘要及三个项目摘要，避免写死演示文案或传递完整正文。浮层开合不会撑开页头。

`PencilDefinitions` 在根布局定义一次静态 SVG 纸纹与轻微位移，`HanddrawnMark`、页头岸线和页脚手绘线共用纹理。笔触使用重描和颗粒，滤镜噪声不逐帧更新；图像头像不套铅笔滤镜。避免继续给这些装饰叠加普通的 1px CSS 直线。
