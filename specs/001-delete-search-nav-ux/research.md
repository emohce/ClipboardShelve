# Research: 001-delete-search-nav-ux

## R-001 — 删除后“自动回滚”与数据一致性

**Decision**: 优先验证 **内存列表、`showList` 刷新、`deleteAnchor` / `delete-recovery` 导航** 与 **`debouncedWriteLocal` 落盘** 的时序；若界面已删但重进恢复，按 EM-2026-04-06-json-db-debounce-persist 的已确认通路排查 `immediate` 写盘。

**Rationale**: 规格 FR-001 要求“无撤销则不恢复”。代码中存在删除后专用导航恢复路径 `submitNavigationAction("delete-recovery", …)`（[`ClipItemList.vue` L1738–1763](../../src/cpns/ClipItemList.vue#L1738)），可能与用户感知的“回滚”混淆；另一类是持久化未刷盘导致重进“像回滚”。

**Alternatives considered**:  
- 仅加 UI 防抖 — 不解决 JSON 未写入根因。  
- 删除后强制同步写盘 — 需评估性能与 uTools IO；仅在证实防抖未命中时再收紧。

## R-002 — 搜索时“错误退出”

**Decision**: 将 **退出搜索** 的触发源列为排查清单：`filterText` 变空时 `emit('onEmpty')`（[`ClipSearch.vue` L72–81](../../src/cpns/ClipSearch.vue#L72)）、失焦 `onPanelHide`（[`ClipSearch.vue` L84–88](../../src/cpns/ClipSearch.vue#L84)）、以及主窗体捕获阶段 **`keyDownCallBack`** 对 `key.length === 1` 的“展开搜索”逻辑（[`Main.vue` L1294–1315](../../src/views/Main.vue#L1294)）。

**Rationale**: “部分字符”可能对应：**多码元字符**（`key` 非单字符）、**组合键被误判**、或 **某路径意外清空 `modelValue`**。需要在复现字符集合上比对上述三条链路。

**Alternatives considered**:  
- 全局禁止 `onEmpty` — 会破坏“删空查询即退出”的预期，应精细化而非删除。

## R-003 — 中文 IME 下 Enter 与 `list-enter`

**Decision**: 在热键分发层或 `list-enter` 处理器中，对 **`e.isComposing === true`**（及必要的 `key === 'Process'` 防御）**短路**，使 Enter 由输入法与 `<input>` 默认行为处理；与 `Main.vue` 展开搜索时对 composition 的跳过（[`Main.vue` L1299–1300](../../src/views/Main.vue#L1299)）保持一致。

**Rationale**: 当前 `list-view-full`、`list-drawer-open` 使用 `isFocusInSearch()` 提前返回，但 **`list-enter` 未做同等保护**（[`ClipItemList.vue` L1920–1959](../../src/cpns/ClipItemList.vue#L1920)），易导致组字未结束时仍触发复制退出。

**Alternatives considered**:  
- 仅在 `ClipSearch` 内 `preventDefault` — 无法阻止捕获阶段热键已处理的情况，应在 registry 链路与 feature 侧一致。

## R-004 — 虚拟列表滚动：完整可见与尽量居中

**Decision**: 在 **`useVirtualListScroll.resolveScrollInstruction` / `scrollToIndex`** 与 **`submitNavigationAction` + `normalizeNavigationScrollOptions`** 中，对 **步骤导航（step-nav）接近 index 0 或虚拟列表首项未量测** 的场景，优先 **`edge-align` + `start` + `forceScroll`** 或增强 `center-preferred` 的“未完全可见则必滚”判定；变更前用 DOM 验证真实滚动祖先（见 EM-2026-04-06-scroll-path）。

**Rationale**: 已有 `center-preferred` 与 `centerStartIndex`（[`ClipItemList.vue` L1569–1599](../../src/cpns/ClipItemList.vue#L1569)），但规格要求 **顶部项必须完整展示**；`scrollIntoView({ block: 'center' })` 在首尾可能劣于 `start/end` 组合。

**Alternatives considered**:  
- 一律 `block: 'nearest'` — 已不能满足“尽量居中 + 顶齐完整”的双重要求。

## R-005 — 固定顶栏与列表的竖向间距（`.clip-break`）

**Decision**：在 [`Main.vue`](../../src/views/Main.vue) 用 `.clip-break` / `.clip-break--with-sub` 为 `position: fixed` 的 [`clip-switch`](../../src/style/cpns/clip-switch.less) 预留高度；**按顶栏单行 / 双行（收藏子 Tab）与响应式断点**设定数值，并在窄屏**避免**使用过大的占位（曾导致顶栏与首条列表间“大块无效空白”）。空列表占位 `min-height` 与顶栏预留联动微调。

**Rationale**：占位不足会遮挡首条；过大损害信息密度，与“紧凑工具窗”预期冲突。收藏 Tab 使用 **`.clip-break--with-sub`**，高度取「单行 `.clip-break` + 子标签行约 30px 量级」与无子栏**同一套收窄策略**，避免收藏页单独留下一条过大空白带。

**Alternatives considered**：用 JS 测量顶栏 `offsetHeight` 动态写入 spacer — 可追溯性强但引入布局闪动；当前仍以 CSS 分断点维护为主。

## R-006 — 首项滚动与 WebView

**Decision**：列表索引 **0** 且顶对齐时，在滚动容器上 **`scrollTop = 0`**（见 [`useVirtualListScroll.js`](../../src/hooks/useVirtualListScroll.js)），**不再**对该路径依赖 `scrollIntoView({ block: 'start' })`，以降低嵌套 WebView 误滚祖先链、导致首项“消失”的风险。

**Rationale**：与 R-004、`list-nav-up` 近顶 **`end` 对齐**策略互补；首项例外单独处理。

## R-007 — 上移接近列表顶部

**Decision**：`list-nav-up` 目标索引落在较小区间（实现中约前 **8** 条）时，使用 **`edge-align` + `end`** 且 **`forceScroll`**，从下方回到近顶区时先露出顶部多项；仅 **`nextIdx <= 0`** 时用顶对齐并与 R-006 协同。

**Rationale**：单独对 `nextIdx===0` `start` 仍会在 `1…n` 仍用 `center` 时把 0…n-1 留在视窗外。
