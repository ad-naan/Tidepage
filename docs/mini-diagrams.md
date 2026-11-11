# 正文手绘小图

图表作为正文里的 `miniDiagram` 原子块，适合解释少量步骤、条件分支和反馈关系。视觉沿用站点的纸面、手绘笔触和暖橙 / 海绿点缀，以清楚的关系和可读文字为主。我们独立实现图表数据、布局和 React SVG 渲染，通过 Rough.js 4.6.4 生成双笔画轮廓、连线和斜线填充。

## 编辑与阅读

正文编辑器的「手绘小图」、选区气泡、插入菜单和 `/diagram` 命令打开选区附近的快捷浮层。输入要求即可流式预览图表，确认后插在选区后，保留原文；AI 只接收选中的文字、绘图要求和当前图表。「详细调整」打开编辑窗口，可套用步骤、分支、循环模板，修改节点文字、形状、颜色、连线和注释，再插入正文。已有图表通过「编辑小图」重新打开。

图表最多 12 个节点、18 条连线。自动布局保持节点分离，跨层和返回连接走外侧通道；正文内按可用宽度完整缩放，可打开完整大图查看原始尺寸并滚动。连线和节点文字按字符宽度估计换行。小图随正文保存，参与编辑器撤销和已保存版本的发布；修改草稿不影响已发布正文。SVG 可单独导出。图片和图表可通过抓手或图形区域拖动，原有块移动快捷键仍可使用。

节点尺寸跟随标签长度；椭圆起点保持紧凑，菱形为文字留出高度。连接与轮廓保留 8px 间距，多分支使用独立出入口。笔触采用较轻的双线，海绿色使用浅色洗染，暖橙强调使用稀疏排线。图表短标签单独使用自托管、按 Unicode 分片的 LXGW WenKai TC 400，不在组件里判断文字语言。界面标题、题注和正文沿用原有字体角色。

主操作复用共享 Button 的按压反馈；方向切换复用 FilterTabs；编辑预览只在初次进入时轻微淡入。减少动态效果时关闭预览出场与边框过渡。SVG 提供标题与关系的文本描述，滚动区域可用键盘聚焦。

## 分层

- `shared/contracts/diagram.ts` 定义受限、带版本的图表数据及纯文本表示；`rich-text.ts` 校验正文节点。
- `shared/lib/diagram-layout.ts` 处理确定性的布局；`shared/lib/diagram-strokes.ts` 将图形送入 Rough.js generator，用图形 ID 派生固定 seed，保证刷新、SSR 和导出时笔迹稳定；`shared/ui/drawing/MiniDiagram` 在编辑和阅读时复用同一 SVG 输出。
- `modules/content/ui/admin/editor/DiagramNode` 负责 Tiptap 适配，`DiagramAssistant` 负责快捷生成，`DiagramDialog` 负责详细编辑。共享 `Dialog` 提供固定页脚与工作窗口布局，保存操作不参与内容滚动。样式与各自视图同目录。
- `modules/content/domain/translation.ts` 将图表标题、注释、节点及连线文字纳入现有全文翻译，保留图形 ID 和连接；Markdown 输出可阅读的节点和关系。
- `modules/ai/domain/diagram.ts` 定义请求，`modules/ai/server/diagram.ts` 组合模型提示和输出校验。路由执行作者 / 管理员权限、同源、请求大小和速率检查，复用后台模型预算与取消机制。

图表 JSON 随正文 JSONB 保存，无需独立表、资源上传或数据库迁移。模型输出只接受结构数据，通过 React 文本节点呈现。

## 快捷 AI 交互

写作和图表共用 `AnchoredPanel` 的选区定位、视口避让和弹簧出场；不随结果增长翻转方向。输入框获得焦点后，用临时编辑器装饰保留源选区，装饰不写入正文。快捷写作支持润色、精简、续写和对当前提案继续修改。Enter 发送、Shift + Enter 换行；输入法组字时不发送。生成期间可停止，结果确认后才替换或插入；正文发生变化时拒绝套用旧位置。

文字流按动画帧合并 React 更新；预览自动跟随输出，手动上滚后暂停跟随。图表接口在客户端请求 SSE 时返回 `status / progress / done / error` 事件，保留 JSON 请求兼容性。进度只包含完整且通过校验的节点与有效连线，最终 `done` 必须再次通过完整协议校验。失败和停止不会覆盖原图；界面展示真实等待、文字输出或节点 / 连线数量，不模拟推理步骤。

交互参考 [Notion 的选区 AI 入口](https://www.notion.com/en-gb/help/notion-ai-faqs) 和 [Tiptap 的渐进流式编辑](https://tiptap.dev/docs/ai/ai-toolkit/client/agents/streaming)。这里沿用项目现有编辑器、浮层和模型服务，未引入其他编辑器运行时。

手绘渲染的参考依据是 [Excalidraw 的图形生成器](https://github.com/excalidraw/excalidraw/blob/master/packages/element/src/shape.ts) 和 [Rough.js 文档](https://github.com/rough-stuff/rough/wiki)。项目只依赖独立的 Rough.js（MIT）；没有引入 Excalidraw 的包、格式或画板运行时。

## 国际化

所有图表界面文案位于语言目录的 `diagrams`，编辑器入口使用 `admin.editor.blocks.diagram`。界面跟随当前 UI 语言；模板和新节点文字根据文章的 `contentLocale` 从现有 `catalogs` 注册表加载。组件不包含针对具体语种的判断或内联翻译。

新增语言沿用现有流程：登记 `localeRegistry` 和 `catalogs`，补齐同构词典。AI 使用同一内容语言，图表内部文字也参与全文翻译。语言资源加载失败显示词典中的错误信息，不回退到其他语种的模板。

## 验证

`tests/platform/diagram.test.ts` 覆盖结构边界、非法连接、分支和回路布局、文本与 Markdown、全文翻译、草稿写回、发布版本隔离，以及完整 / 非法 / 中断的模型响应。全局国际化和架构检查继续检查词典同构、目录依赖与控件归属。

`tests/platform/diagram-stream.test.ts` 覆盖 JSON 分片、转义字符、半成品节点、非法连接、SSE 的 UTF-8 分片、完成事件校验、取消及缺少最终结果时的失败行为。
