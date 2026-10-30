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
