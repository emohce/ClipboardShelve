# Plan: 列表键盘移动、分页一致与选中/锁标展示

## 1. 变更目标

- 对齐 [`01-spec.md`](01-spec.md)：单步导航在条目**完全可见**时不触发多余滚动，否则滚至**完全可见**；**Ctrl+分页**与**长按触发的分页**共用同一套步长与对齐策略；删除与筛选后选中与展示一致；锁/收藏状态及时、单行不换行挤版；分页交互「滚动 + 高亮」合计耗时在可接受范围内（目标 **≤300ms**，以验证记录为准）。

## 2. 现状与根因

### 2.1 滚动与「完全可见」

- [`ClipItemList.vue`](../../../src/cpns/ClipItemList.vue) 已存在 `isNodeFullyVisible(node, container)`（约 1457–1464 行）：用 `getBoundingClientRect` 比较**整行**是否落在容器上下边界内，语义与 spec「部分露出不算可见」一致。
- **根因 A**：`scrollActiveNodeIntoView` 在存在 `scrollerRef.scrollToItem` 时（约 1476–1485 行）**直接** `scrollToItem(index, { align })` 并 `return`，**未**先判断当前节点是否已完全可见；而降级 DOM 路径（约 1488–1501 行）会在 `!forceScroll && isNodeFullyVisible` 时提前返回。虚拟列表路径与 DOM 路径不一致，易导致「已可见仍滚动」或滚动过于频繁。
- **根因 B**：单步导航传入 `block: "nearest"`（如 `list-nav-up` / `list-nav-down` 约 1913–1916、1969–1974 行；`startAutoScroll` 首次单步约 2320–2323、2335–2338 行）。`vue-virtual-scroller` 的 `align: "nearest"` 与 spec 要求的「完全可见才免滚」**不等价**，需以显式 `isNodeFullyVisible`（或等效几何判定）为准。

### 2.2 分页双路径不一致

- **Ctrl+分页**：`registerFeature("list-page-up" | "list-page-down")`（约 1983–2010 行）使用 `getPageStep()` 与 `setKeyboardActiveIndex(..., { block: "start" | "center" | "end" })`；`list-page-up` 在顶部附近还调用 `window.toTop()`（约 1986–1992 行）。
- **长按分页**：存在两路——(1) `startKeyHoldAutoScroll` 超时后按 `getPageStep()` + `block: "center"`（约 1763–1778 行）；(2) `startAutoScroll` 在首次单步之后，`hasRepeated` 为真时同样按页步长 + `center`（约 2324–2327、2339–2345 行）。
- **根因 C**：Ctrl 路径与长按路径在**边界处理**（如 `window.toTop`）、**对齐**（`start`/`end`/`center` 选择）上不完全相同，违反 spec「两种方式一致」。
- **根因 D**：`halfPageScrollAndMove`（约 1656–1734 行）仍使用「半页滚动 + 再移动一项 + `start`/`end`」策略，若仍被某条路径引用，可能与统一分页语义冲突；实现阶段需确认引用关系，避免遗留第三套行为。

### 2.3 热键与 `list-nav-*` 守卫

- `registerFeature("list-nav-up", (e) => { if (e?.key === "ArrowUp") return false; ... })`（约 1899–1901 行）在 `key === "ArrowUp"` 时直接 `return false`。与 [`hotkeyRegistry.js`](../../../src/global/hotkeyRegistry.js) 的 `dispatch` 配合时，该守卫决定 **feature 是否消费事件**；与 `document` 捕获阶段的 `unifiedKeyHandler` + `startAutoScroll`（约 2394–2419、2309+ 行）形成**双通道**。根因需在任务阶段厘清：避免重复移动、重复计时或与 `stopKeyHold` 竞态。

### 2.4 删除与选中

- `showList` 与长度变化的多段 `watch`（约 1825–1876 行）、删除流程中 `pendingHighlightedItemId` / `pendingActiveIndexAfterDelete`（`list-delete` 约 2204–2214 行）已存在。**根因 E**：删除后闪动或错行往往来自 **activeIndex 与虚拟列表 DOM 不同步**或 **nextTick 顺序**；需在实现时针对「删当前项 → 下一条高亮」路径做一次调用链梳理与最小修复。

### 2.5 锁/收藏与单行布局

- 行模板在 [`ClipItemRow.vue`](../../../src/cpns/ClipItemRow.vue)：`clip-time` 内顺序展示收藏星标、锁、`relative-date`、tags（约 19–35 行）；样式集中在 [`clip-item-list.less`](../../../src/style/cpns/clip-item-list.less)（以实际选择器为准）。
- **根因 F**：若锁/收藏更新依赖列表重算或滞后于 `activeIndex` 变更，会出现「移动后才更新」；若 `clip-info` / `clip-data` 未约束 `min-width: 0`、省略与 `flex` 换行，易出现图标与文字**异常换行**。

## 3. 设计方案

### 3.1 统一「是否滚动」判定（核心）

- 在 `setKeyboardActiveIndex` 或 `scrollActiveNodeIntoView` 入口增加可选参数（如 `scrollMode: 'minimal' | 'always'` 或在现有 `options` 中扩展），语义为：
  - **单步**：若新 `activeIndex` 对应节点已对 `getScrollContainer()` **完全可见**，且策略为「最小滚动」，则**跳过** `scrollToItem` / `scrollIntoView`。
  - **分页 / 需强制对齐**：仍按 `center` / `start` / `end` 调用 `scrollToItem`，保证分页后选中居中或贴边规则与现有一致。
- 对 **虚拟列表** 与 **DOM 降级** 两条分支统一先判定再滚动，消除根因 A/B。

### 3.2 抽取「分页导航」公共函数

- 新增内部函数（命名以代码风格为准），例如 `navigateByPage(direction)`：
  - 输入：`direction`、当前 `activeIndex`、`showList.length`。
  - 使用现有 `getPageStep()`（约 1633–1644 行）计算目标索引；边界与 `list-page-up` / `list-page-down` 对齐（含是否保留 `window.toTop()`：若与「长按一致」冲突，应在实现时二选一并写入 `04-verify.md`）。
- `registerFeature("list-page-up" | "list-page-down")`、`startKeyHoldAutoScroll` 内分页分支、`startAutoScroll` 进入 repeat 后的分页分支**改为调用同一函数**，满足 spec 与根因 C。

### 3.3 协调 `unifiedKeyHandler` / `startAutoScroll` / `registerFeature`

- 在不大改热键层的前提下，明确**单一事实来源**：方向键长按最终分页逻辑只经 `navigateByPage` + 统一滚动策略。
- 若 `list-nav-up` 的 `e.key === "ArrowUp"` 守卫为历史兼容，实现时在 `03-tasks.md` 中单开任务：或修正为 `repeat` 判定，或注释说明与 `startAutoScroll` 的分工，避免双次步进。

### 3.4 删除与筛选

- 在 `onItemDelete` 回调链与 `showList` 更新后，确保 `activeIndex` 与 `restoreSelection` 的调用顺序固定；必要时对「删当前」路径增加一次 `nextTick` 后的 `scrollActiveNodeIntoView`（带「完全可见」策略），消除错行与闪烁。

### 3.5 锁/收藏与单行

- **数据**：确认 `item.locked` / 收藏状态来自 props 项对象，变更后 `showList` 中对应项是否立即替换引用；若存在批量 `scheduleLockPersist`，在 UI 上仍应先更新**内存项**再异步落库（若当前已满足则仅补观测）。
- **布局**：在 `ClipItemRow` 或 `.clip-info` / `.clip-data` 上增加 `flex` + `min-width: 0` + 文本 `ellipsis`，锁/收藏图标 `flex-shrink: 0`，避免换行；避免在 `v-for` 行内引入高开销计算。

### 3.6 性能与 300ms

- 保持 `scrollToItem(..., { smooth: false })`（约 1482–1483 行）以降低动画耗时。
- 在 `04-verify.md` 中约定：使用 `performance.now()` 在「分页触发点」到 **`nextTick` 后**且 **`requestAnimationFrame` 一次**后采样（或项目统一约定）作为「滚动 + 高亮合计」近似；记录列表条数与窗口高度。**未测不得写已通过**。

## 4. 受影响文件

| 文件 | 改动意图 |
|------|----------|
| [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue) | 统一完全可见判定与 `scrollToItem` 路径；抽取分页函数；协调单步/长按/Ctrl；必要时调整删除后滚动与 watch |
| [`src/cpns/ClipItemRow.vue`](../../../src/cpns/ClipItemRow.vue) | 单行布局与结构微调（ellipsis、防换行），保证锁/收藏与标题同屏展示 |
| [`src/style/cpns/clip-item-list.less`](../../../src/style/cpns/clip-item-list.less) | 配套 flex/省略/图标列样式 |
| [`src/global/hotkeyBindings.js`](../../../src/global/hotkeyBindings.js) | 仅在分页键位或 feature 映射需调整时修改（默认不改键位） |
| [`src/global/hotkeyRegistry.js`](../../../src/global/hotkeyRegistry.js) | 仅在 repeat/分发策略必须配合时小改（默认尽量少动） |
| [`specs/26040501-list-move/cursor/03-tasks.md`](03-tasks.md) | 实现阶段原子任务拆分 |
| [`specs/26040501-list-move/cursor/04-verify.md`](04-verify.md) | 验证记录与 300ms 采样说明 |

**默认不修改** [`public/plugin.json`](../../../public/plugin.json)、`preload.js`、`listener.js`，除非验证证明热键层必须调整。

## 5. 数据与状态变更

- 无新的持久化字段。
- 运行时：继续以 `props.showList`、`activeIndex`、虚拟 scroller ref 为权威；若增加「滚动策略」仅存在于 `setKeyboardActiveIndex` / `scrollActiveNodeIntoView` 的参数，不写入全局 store。

## 6. 接口与交互变更

- **用户可见**：单步时列表更少「无意义跳动」；Ctrl 与长按分页行为对齐；删除与锁/收藏后行内状态与选中更稳定。
- **对外 API**：`defineExpose` 保持；若签名扩展仅限内部函数，不暴露给父组件。

## 7. 实施步骤

1. 通读 `scrollActiveNodeIntoView`、`setKeyboardActiveIndex`、`getPageStep` 与三处分页调用链，画清调用顺序（含 `unifiedKeyHandler`）。
2. 实现「完全可见则跳过滚动」并接入虚拟列表 `scrollToItem` 分支。
3. 抽取 `navigateByPage`（或等价），替换 `list-page-up` / `list-page-down`、`startKeyHoldAutoScroll` 与 `startAutoScroll` 中的重复分页逻辑，对齐边界与 `window.toTop` 行为。
4. 复核 `list-nav-up` 守卫与 `startAutoScroll` 是否双重步进；写最小修复或注释 + 测试用例。
5. 删除与筛选路径：针对删当前项做 activeIndex + 滚动回归；必要时补一次 `scrollActiveNodeIntoView`。
6. `ClipItemRow` + Less：锁/收藏与单行省略，避免换行。
7. `pnpm run build`；`pnpm run serve` 下按 `04-verify.md` 手工验收；长列表下用控制台脚本或 Performance 粗测 300ms（结果写入 `04-verify.md`）。

## 8. 测试与验证方案

- **构建**：`pnpm run build`（仓库默认）必须通过。
- **手工（主界面列表）**
  - 单步上下：选中行已完全可见时，列表不额外滚动；仅部分可见时，滚后整行完全可见且高亮正确。
  - 长按与 Ctrl+上/下：步长、居中/首尾对齐与选中反馈一致。
  - 列表首尾、仅一条、空列表：不越界、不异常。
  - 删除当前项：下一条选中正确，无错行高亮与明显闪烁。
  - 搜索/筛选后方向键导航索引与列表一致。
  - 切换锁/收藏：图标与状态立即正确，窄窗口下行内不换行。
- **性能**：在 `04-verify.md` 记录分页合计耗时采样方式、环境与是否 ≤300ms（未测不填通过）。

## 9. 风险与回滚点

- **虚拟列表与几何判定**：`scrollToItem` 后一帧内 `getBoundingClientRect` 可能尚未稳定；若出现误判，需在 `nextTick`+`rAF` 后复测或放宽 1px（写入 verify）。
- **`window.toTop()`**：若与「长按一致」冲突，改动可能影响窗口置顶习惯；需产品确认后调整。
- **双通道键盘**：修改 `list-nav-*` 守卫可能影响全局热键消费顺序；回归 Shift 预览、搜索框聚焦等场景。
- **回滚**：主要回滚 `ClipItemList.vue` + 样式/行组件；热键文件若未改则无需回滚。

## 10. 待确认项

- **`window.toTop()`**（`list-page-up` 顶部行为）是否与「长按分页」完全一致：若保留，则长按路径是否也需调用（可能改变语义）；实现前在任务或验证阶段二选一。
- **多选模式**下「完全可见」是否仅针对**高亮行**（当前 `activeIndex`）还是需考虑多选条带区域；默认按单选高亮行实现。
