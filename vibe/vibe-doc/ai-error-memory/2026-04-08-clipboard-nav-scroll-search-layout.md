# Error Memory: EM-2026-04-08-clipboard-nav-scroll-search-layout

## 1. 背景与症状

本轮主界面剪贴板列表相关交互：删除疑似回滚、搜索误退出、IME 下 Enter 误触列表、方向键滚动顶部项不完整/消失、固定顶栏与列表间空白过大。

## 2. 错误归类

- `runtime-path-mismatch`（真实滚动祖先、`scrollIntoView` 与 WebView 祖先链）
- `environment-assumption`（uTools / 嵌套 Chromium 与 `window.focus`、composition）
- `framework-misuse`（多选删除 `preferItemId` 指向待删项）

## 3. 误判链路

- 仅调虚拟滚动阈值或 `center` 比例，不区分**接近列表顶部**与**中部**的滚动语义。
- 认为 `scrollIntoView({ block: 'start' })` 在所有环境下对第 0 条都安全。
- 未检查多选删除时 `preferItemId` 是否仍落在**保留集**内。
- 将列表与顶栏间距一律加大（例如窄屏 `clip-break` 过高），误把「防遮挡」做成「大块留白」。

## 4. 已证伪方案

- 仅对 `nextIdx === 0` 做顶对齐，仍不足：索引 `1…n` 用 `center` 时会把列表最上面多条留在视窗上方。
- 依赖 **`scrollIntoView(block: 'start')`** 对齐首项：在嵌套 WebView 中可能沿祖先链误滚，**首项反被滚出可见区域**。
- 搜索已展开时仍对单字符 `keydown` 执行 **`window.focus()`**，与搜索框抢焦点，诱发异常失焦/退出感。

## 5. 已确认通路

- **列表滚动容器**：[`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue) 内 `scrollParentRef`（`.clip-item-scroll`）；对齐 [EM-2026-04-06-scroll-path](2026-04-06-scroll-path.md) 的 DOM + `scrollIntoView` 主通路（**首项例外见下**）。
- **首项顶对齐**：在 [`src/hooks/useVirtualListScroll.js`](../../src/hooks/useVirtualListScroll.js) 中 **`index === 0` 且 `align === 'start'` 时设置 `container.scrollTop = 0`**，不再对该路径调用 `scrollIntoView`，避免误滚祖先。
- **上移接近顶部**：对较小目标索引（如 `nextIdx <= 8`）使用 **`edge-align` + `end` + `forceScroll`**，把高亮落在视窗偏下，腾出上方空间露出顶部多项；`nextIdx <= 0` 仍用 **`edge-align` + `start`** 并与 `scrollTop = 0` 协同。
- **搜索**：[`src/views/Main.vue`](../../src/views/Main.vue) 在搜索已展开且事件目标在 `.clip-search` 内时 **不再 `window.focus()`**；[`src/cpns/ClipSearch.vue`](../../src/cpns/ClipSearch.vue) 用 composition 状态抑制误触发 `onEmpty`，`compositionend` 补偿合法清空（规避 reveal-guard 与 `onEmpty` 冲突）。
- **IME + Enter**：[`src/global/hotkeyRegistry.js`](../../src/global/hotkeyRegistry.js) 在 **`e.isComposing`** 时不分发快捷键；[`list-enter` / `list-ctrl-enter`](../../src/cpns/ClipItemList.vue) 在搜索框聚焦或 `Process` 时 **`return false`**。
- **删除持久化**：删除路径 `updateDataBaseLocal(undefined, { immediate: true })`（见 [EM-2026-04-06-json-db-debounce-persist](2026-04-06-json-db-debounce-persist.md) 体系）；多选删除 **`preferItemId`** 仅在**未删除的保留项**中选取邻近 id。
- **顶栏占位**：[`src/views/Main.vue`](../../src/views/Main.vue) 中 **`.clip-break`** / **`.clip-break--with-sub`（收藏 + 子标签）** 高度与 [`ClipSwitch`](../../src/style/cpns/clip-switch.less) 固定顶栏实际占位匹配；**窄屏**原 **仅单行** `clip-break` `132px` 级、**收藏双行** `144px` 级均偏大致大块空隙，已按「单行紧、双行 = 单行 + ~30px 量级」收紧，并与 `clip-empty-status` 的 `min-height` 联动校验。

## 6. 适用触发条件

| 症状关键词 | 模块 |
|------------|------|
| 第一项选中后消失、顶行裁切、`scrollIntoView` | `useVirtualListScroll.js`, `ClipItemList.vue` |
| 上移后顶部多项一直看不见 | `list-nav-up`, `center-preferred` |
| 搜索打字闪退、`onEmpty` | `ClipSearch.vue`, `Main.vue` keydown |
| 拼音 Enter 复制退出 | `hotkeyRegistry.js`, `list-enter` |
| 顶栏与列表大缝 | `.clip-break`, 媒体查询 |

## 7. 禁止再试的做法

- 在未复现环境下，对首项继续堆叠 `scrollIntoView(start)` 微调。
- 用继续增大 `clip-break`「解决遮挡」而不量 `ClipSwitch` 实际高度。
- 多选删除时 **`preferItemId = 当前高亮`** 而不校验该 id 是否在删除集外。

## 8. 推荐优先策略

- 键盘导航：**中部** `center-preferred`；**近顶小段**上移用 **`end` 对齐**；**首项** **`start` + `scrollTop=0`**。
- 固定顶栏布局：**可测量或分断点**配置 `.clip-break`，与 **收藏子 Tab 双行** 分支 class 一致；定期与 UI 对照避免过剩 `padding`。
- 搜索与 IME：先拦 **composition** 与 **搜索框焦点**，再谈 feature 级细节。

## 9. 关联文件 / 模块

- `src/views/Main.vue`（`clip-break`、`keyDownCallBack`）
- `src/cpns/ClipItemList.vue`（`list-nav-up`/`down`、`list-enter`、删除 anchor）
- `src/cpns/ClipSearch.vue`
- `src/hooks/useVirtualListScroll.js`
- `src/global/hotkeyRegistry.js`
- `src/global/initPlugin.js`（删除落盘）
- `src/style/cpns/clip-switch.less`

## 10. 后续观察点

- 插件窗口极窄 + 搜索展开时，`.clip-break` 是否需单独加权（若未来搜索占多行）。
- `STEP_UP_TOP_BAND` 与 `clip-break` 调整后，长按方向键自动滚是否与顶栏不重叠。
