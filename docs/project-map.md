# 按任务找文件

项目根目录是 `E:\26Project\adnaan-blog`。下列路径都从根目录开始。编辑器按 `Ctrl+P`，粘贴文件路径，可以直接打开。

## 先认识五个位置

| 位置                     | 可以理解为             | 什么时候进这里                     |
| ------------------------ | ---------------------- | ---------------------------------- |
| `src/app`                | 网站地址入口           | 新增网址、取数、SEO、组合视图      |
| `src/widgets/site-shell` | 每页共用的外壳         | 页头、导航、页脚、阅读进度         |
| `src/modules`            | 按功能分好的页面与业务 | 首页、文章、播放器、海岸等具体功能 |
| `src/shared`             | 各功能共用的工具箱     | 公共控件、翻译、配置、通用工具     |
| `src/server`             | 服务端公共工具和连接   | 数据库、缓存、HTTP、日志、SEO      |

**改页面外观，通常去 modules，不是 app。** 路由文件负责拿数据，再把数据交给视图显示。公共控件用 shared/ui 的现成组件。

## 页面在哪里

`[locale]` 是语言位置，例如 zh-CN 或 en。`(site)` 只是代码分组，不出现在网址里。

| 页面地址                   | 路由入口（位于 `src/app/[locale]` 下） | 外观与交互文件                                      |
| -------------------------- | -------------------------------------- | --------------------------------------------------- |
| `/zh-CN`                   | `(site)/page.tsx`                      | `src/modules/home/ui/HomeView.tsx`                  |
| `/zh-CN/articles`          | `(site)/articles/page.tsx`             | `src/modules/content/ui/articles/ArticlesView.tsx`  |
| `/zh-CN/articles/文章标识` | `(site)/articles/[slug]/page.tsx`      | `src/modules/content/ui/articles/ArticleDetail.tsx` |
| `/zh-CN/notes`             | `(site)/notes/page.tsx`                | `src/modules/content/ui/notes/NotesView.tsx`        |
| `/zh-CN/projects`          | `(site)/projects/page.tsx`             | `src/modules/content/ui/projects/ProjectsView.tsx`  |
| `/zh-CN/quotes`            | `(site)/quotes/page.tsx`               | `src/modules/content/ui/quotes/QuotesView.tsx`      |
| `/zh-CN/gallery`           | `(site)/gallery/page.tsx`              | `src/modules/content/ui/gallery/GalleryView.tsx`    |
| `/zh-CN/about`             | `(site)/about/page.tsx`                | `src/modules/content/ui/about/AboutView.tsx`        |
| `/zh-CN/friends`           | `(site)/friends/page.tsx`              | `src/modules/friends/ui/FriendsView.tsx`            |
| `/zh-CN/explore`           | `(immersive)/explore/page.tsx`         | `src/modules/world/ui/CoastalExperience.tsx`        |

样式在视图旁边，例如 `QuotesView.module.css`。文章列表行使用 `ArticleList.tsx`，它被首页和归档复用，改完两处都看一下。

## 按屏幕部位找

| 屏幕上的东西                       | 去哪里                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------- |
| 首页姓名、身份、介绍和彩蛋         | `src/modules/home/ui/HomeHero.tsx`、`HomeHero.module.css`                  |
| 首页最新文章、下方摘要和整体布局   | `src/modules/home/ui/HomeView.tsx`、`HomeView.module.css`                  |
| 技术 / 产品 / 生活的小路径         | `src/modules/home/ui/Journey.tsx`                                          |
| GitHub 等真实链接、头像路径        | `src/shared/config/profile.ts`                                             |
| 个人外链按钮的样式                 | `src/modules/home/ui/ProfileLinks.tsx`、配套 CSS                           |
| 签名和滚动后的头像                 | `src/widgets/site-shell/header/HeaderBrand.tsx`                            |
| 页头布局、搜索、音乐、作者活动入口 | `src/widgets/site-shell/header/SiteHeader.tsx`                             |
| 顶部栏目、更多、悬停预览           | `src/widgets/site-shell/navigation/SiteNavigation.tsx`、配套 CSS           |
| 晚霞与不规则天空背景               | `src/widgets/site-shell/header/HeaderSky.tsx`、`src/styles/sky-header.css` |
| 作者活动详情                       | `src/widgets/site-shell/header/ActivityDetails.tsx`                        |
| 页脚与偏好、访客人数的排列         | `src/widgets/site-shell/footer/SiteFooter.tsx`、配套 CSS                   |
| 各内容页的编号、标题、小插画       | `src/modules/content/ui/layout/ContentHeading.tsx`                         |
| 文章中的网址、电影、代码块         | `src/modules/content/ui/articles/ArticleBlocks.tsx`、配套 CSS              |
| 评论、手记回应                     | `src/modules/engagement/ui/Discussion.tsx`、`NoteReplies.tsx`              |
| 唱片、唱臂、音乐播放器             | `src/modules/media/ui/player/`                                             |
| 首页海岸插画、水獭                 | `src/modules/world/ui/CoastIllustration.tsx`、`OtterDrawing.tsx`           |
| 三维场景建模与环境                 | `src/modules/world/runtime/createCoastScene.ts`、`coastEnvironment.ts`     |

## 文案和内容不是同一个位置

| 要改什么                             | 位置                                             |
| ------------------------------------ | ------------------------------------------------ |
| 标题、按钮、提示、个人介绍等界面文字 | `src/shared/i18n/messages/zh-CN.json`、`en.json` |
| PostgreSQL 模式的真实内容            | 数据库；此时修改演示文件不会改变页面             |

例如首页身份文字是 `home.hero.intro.line2`，不是 profile.ts。`profile.ts` 只保留姓名、头像路径与外链，避免两份介绍混淆。

## 公共样式与控件

| 要改什么                     | 入口                                                             |
| ---------------------------- | ---------------------------------------------------------------- |
| 字体、字号、字重、间距变量   | `src/styles/tokens.css`                                          |
| 统一版心宽度与两侧留白       | `src/styles/layout.css` 的 `--site-content-max`、`--site-gutter` |
| 字体包与全局样式引入         | `src/app/layout.tsx`                                             |
| 既有页面应用规范             | `src/styles/design-contract.css`                                 |
| 按钮                         | `src/shared/ui/button/Button.tsx`                                |
| 输入、文本域、滑块、文件选择 | `src/shared/ui/field/`                                           |
| 分类筛选栏                   | `src/shared/ui/filter-tabs/FilterTabs.tsx`                       |
| 弹窗、锚点浮层               | `src/shared/ui/dialog/`、`overlay/`                              |
| 全局操作提示                 | `src/shared/ui/feedback/NoticeProvider.tsx`                      |
| 铅笔线、纸边、潮痕等材料     | `src/shared/ui/drawing/`                                         |

`globals.css`、`chrome.css`、`refinements.css` 保留历史公共基线。改一个页面时，先找该视图旁的 CSS Module，不要继续向全局文件末尾堆覆盖规则。

## 以前的文件去哪了

| 旧位置 / 名字                                     | 新位置 / 名字                                            |
| ------------------------------------------------- | -------------------------------------------------------- |
| `src/components/Shell.tsx`                        | `src/widgets/site-shell/SiteShell.tsx`                   |
| `src/components/SiteHeader.tsx`、`SiteFooter.tsx` | `widgets/site-shell/header/`、`footer/`                  |
| `src/components/HomeHero.tsx`、`Journey.tsx`      | `src/modules/home/ui/`                                   |
| `src/components/Gallery.tsx`                      | `src/modules/content/ui/gallery/GalleryView.tsx`         |
| `src/components/RoomHeading.tsx`                  | `src/modules/content/ui/layout/ContentHeading.tsx`       |
| `src/components/MusicPlayer.tsx`                  | `src/modules/media/ui/player/MusicPlayer.tsx`            |
| `src/components/Sketch.tsx`                       | `src/shared/ui/illustration/CoastalVignette.tsx`         |
| `src/shared/ui/primitives.tsx`                    | 拆成 `button/Button.tsx`、`dialog/Dialog.tsx` 等独立控件 |
| `SpringButton`                                    | `Button`，动效不再写进组件名字                           |

继续开发时按新位置打开文件，不需要重建旧目录。
