# Error Memory: EM-2026-06-09-ui-structure-interaction-guardrails

Tool: codex

## 1. 背景与症状

- 任务背景：此前 UI 展示、逻辑、交互曾被误操作调整，后续又回滚；当前需要让 AI 明确理解现有页面结构为什么这样保留。
- 直接症状：如果只按“视觉优化”重排顶栏、列表、设置页或快捷键层，容易破坏搜索、键盘导航、虚拟滚动、删除锚点、迁移状态提示和输入框默认行为。
- 用户可观察现象：顶部遮挡或大空白、搜索焦点闪退、IME 回车误复制、列表导航裁切、删除后选中项跳错、设置页输入框无法删除文本、存储迁移失败不可见。

## 2. 错误归类

- `root-cause-misread`
- `runtime-path-mismatch`
- `framework-misuse`
- `invalid-verification`
- `over-abstraction`

## 3. 当前 UI 页面结构

- 主界面是紧凑工具面板，不是展示型页面；首屏核心是固定顶栏、搜索/多选操作、列表和清除面板：[../../../src/views/Main.vue](../../../src/views/Main.vue:1)。
- 顶栏由 `ClipSwitch` 固定在顶部，右侧操作区在“普通模式”和“搜索展开模式”之间互斥显示：[../../../src/views/Main.vue](../../../src/views/Main.vue:10)、[../../../src/style/cpns/clip-switch.less](../../../src/style/cpns/clip-switch.less:1)。
- `clip-break` 是 fixed 顶栏的占位层，收藏 tab 有第二行子 tab，所以必须有 `clip-break--with-sub` 分支；这不是装饰间距：[../../../src/views/Main.vue](../../../src/views/Main.vue:115)、[../../../src/views/Main.vue](../../../src/views/Main.vue:1852)。
- 列表组件内部拥有真实滚动容器 `.clip-item-scroll`，触底加载由组件内滚动事件触发，不依赖 document 级滚动冒泡：[../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:9)、[../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:1341)。
- 设置页是配置工作台，使用 `存储 / 快捷键 / 功能 / 功能配置` 四个 tab；存储模式状态必须在“存储”tab 中直接可见：[../../../src/views/Setting.vue](../../../src/views/Setting.vue:5)、[../../../src/views/Setting.vue](../../../src/views/Setting.vue:64)。

## 4. 为什么当前这样处理

- 顶栏 fixed：uTools 小窗口里主操作必须稳定可见；但 fixed 会脱离文档流，所以必须用精确占位避免列表被遮挡。
- 操作区与搜索区互斥：搜索展开时要把键入、锁定筛选、清空和焦点行为集中在 `ClipSearch`，避免右侧按钮抢宽或抢焦点。
- 列表局部滚动：虚拟/分页列表需要自身滚动容器才能稳定恢复高亮和触底加载；把滚动改回 document 会破坏键盘导航和加载更多。
- tab 状态恢复：主 tab 和收藏子 tab 保存各自高亮索引；切 tab 后不应强行调用重复刷新或无条件回顶：[../../../src/views/Main.vue](../../../src/views/Main.vue:1381)、[../../../src/views/Main.vue](../../../src/views/Main.vue:1410)。
- 设置页输入保护：设置页有大量输入框、select 和快捷键搜索，`keyDownHandler` 必须先放过 editable target，避免 Del/Backspace/方向键被全局层误拦截：[../../../src/views/Setting.vue](../../../src/views/Setting.vue:945)。
- 存储迁移状态可见：SQLite 主路径和 JSON fallback 是数据安全链路，设置页必须显示模式、迁移状态、路径、错误和重试入口：[../../../src/views/Setting.vue](../../../src/views/Setting.vue:65)、[../../../src/views/Setting.vue](../../../src/views/Setting.vue:448)。

## 5. 实际效果

- 用户在普通模式下看到紧凑顶栏操作：多选、设置、清空、搜索；搜索展开后只看到搜索输入和锁定筛选，减少误点和焦点冲突。
- 列表保持高密度扫描；少量条目有 compact 行样式，空状态只在当前列表为空时出现。
- 方向键上下移动会根据边界选择 start / center / end 对齐，触底时先加载更多再恢复导航：[../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:2085)。
- Enter、Ctrl+Enter、别名粘贴会避开 IME composing，避免中文输入期间误触复制粘贴：[../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:2230)。
- 搜索框用 reveal guard 和 IME 事件处理“键入展开搜索”的首字符误入问题；Delete 到末尾可以交给列表删除，Backspace 保留文本编辑语义：[../../../src/cpns/ClipSearch.vue](../../../src/cpns/ClipSearch.vue:118)、[../../../src/cpns/ClipSearch.vue](../../../src/cpns/ClipSearch.vue:161)。
- 设置页的存储状态使用 ellipsis 和 title 展示长路径，避免紧凑窗口中路径撑破布局：[../../../src/views/Setting.vue](../../../src/views/Setting.vue:1190)。

## 6. 已证伪方案

- 把主界面改成更“大气”的卡片化/大留白布局：会降低剪贴板工具的扫描效率，并放大小窗口拥挤问题。
- 只凭视觉感觉修改 `clip-break` 高度：会导致顶栏遮挡列表或出现大空白，必须结合 `ClipSwitch` 单行/双行/窄屏状态验证。
- 将列表滚动统一改到 document：会破坏 `.clip-item-scroll` 的触底加载、虚拟滚动可见性和键盘导航恢复。
- 为了“清爽”隐藏设置页存储状态：会让 SQLite 迁移失败、JSON fallback、路径错误不可诊断。
- 在设置页或搜索页做全局快捷键拦截时不先判断输入目标：会破坏输入框删除、选择和 IME。
- 切 tab 后手动重复 `updateShowList()`：当前已经由 watcher 收口；重复刷新可能覆盖保存的 tab 高亮和滚动状态。

## 7. 禁止再试的做法

- 不要在没有截图/浏览器验证的情况下重排主顶栏、搜索区、列表滚动容器或设置页存储状态。
- 不要把“视觉统一”作为理由删除搜索 reveal guard、IME guard、设置页 editable guard 或列表删除锚点逻辑。
- 不要把 `ClipItemList` 的 `.clip-item-scroll` 改成外层 document 滚动，除非同时重做并验证全部键盘导航和加载更多。
- 不要把存储状态提示改成纯提示文案或隐藏到二级入口；失败状态必须直接可见并可重试。
- 不要在收藏 tab、搜索态、多选态、锁定筛选下只验证一种普通列表状态就结束。

## 8. 推荐优先策略

- UI 调整先画清结构：`ClipSwitch fixed 顶栏 -> clip-break 占位 -> ClipItemList 滚动容器 -> overlay / clear panel`。
- 修改顶栏或占位高度时，至少验证普通 tab、收藏 tab、搜索展开、窄屏三种宽度。
- 修改列表交互时，至少验证方向键上下、触底加载、PageUp/PageDown、删除后高亮恢复、多选删除、锁定跳过。
- 修改搜索交互时，至少验证键入展开、英文首字符、中文 IME、Backspace 清空、Delete 删除条目、锁定筛选。
- 修改设置页时，至少验证输入框退格/删除、左右切 tab、Esc 返回、存储迁移失败展示和重试按钮。
- 真有必要改变结构时，先写明当前链路、替代链路、回滚点和可执行验证，再动代码。

## 9. 关联文件 / 模块

- [../../../src/views/Main.vue](../../../src/views/Main.vue:1)
- [../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:1)
- [../../../src/cpns/ClipSearch.vue](../../../src/cpns/ClipSearch.vue:1)
- [../../../src/views/Setting.vue](../../../src/views/Setting.vue:1)
- [../../../src/style/cpns/clip-switch.less](../../../src/style/cpns/clip-switch.less:1)
- [2026-04-08-clipboard-nav-scroll-search-layout.md](2026-04-08-clipboard-nav-scroll-search-layout.md:1)
- [2026-06-09-storage-performance-rewrite-pitfalls.md](2026-06-09-storage-performance-rewrite-pitfalls.md:1)

## 10. 后续观察点

- 当前 [../../../src/views/Main.vue](../../../src/views/Main.vue:1845) 附近的 `onUnmounted` 缩进看起来不整齐，后续如修复需只做语法/生命周期闭合验证，不夹带 UI 重排。
- [../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:2337) 有一处成功提示疑似乱码，属于文案修复范围，不应借机重排列表结构。
