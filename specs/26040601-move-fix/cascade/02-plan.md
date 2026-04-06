# Plan: 列表移动与删除修复

## 1. 变更目标
- 统一单步键、长按键与分页键触发的列表滚动与高亮策略，消除重复导航与互相抢滚动。
- 删除后索引恢复单一可信来源，避免父组件与子组件先后修正同一列表。
- 锁/收藏状态变更后展示列表及时一致；行头图标在窄宽下不换行、可缩略。

## 2. 现状与根因
- [src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue) 中同时存在：
  - 热键注册的 `list-nav-up` / `list-nav-down`（单击步进，`setKeyboardActiveIndex` + [src/hooks/useVirtualListScroll.js](../../../src/hooks/useVirtualListScroll.js) 的「整项可见则不滚」）。
  - `document` 捕获阶段的 `unifiedKeyHandler`：在无 Shift 时，对首次 `ArrowUp`/`ArrowDown` 即调用 `startAutoScroll`，经 `AUTO_SCROLL_INITIAL_DELAY` 后按页步长 + `center` + `forceScroll` 连续滚动。
  - 上述两条会在一次按下过程中叠加：短按也会为长按定时器铺线；若时序与释放时刻交错，易出现与「先单步、再分页」不一致或重复滚动。
- `startAutoScroll` 内部自行按 `getPageStep()` 计算目标索引，与 `scrollByPage` 的 align（up 为 `end`、down 为 `start`）不完全一致，长按与 `list-page-up/down` 的视觉结果可能不统一。
- 删除恢复：[src/hooks/useListNavigation.js](../../../src/hooks/useListNavigation.js) 的 `deleteAnchor` 已在子组件 `watch(showList)` 中消费并回写 `activeIndex`；但 [src/views/Main.vue](../../../src/views/Main.vue) 在批量删除、搜索结果删除等路径仍调用 `adjustActiveIndexAfterDelete`（行 755, 1097, 1528, 1562），与 `deleteAnchor` 的 `nextTick` 滚动可能形成二次抢占。
- 锁/筛选：当前锁状态切换已在 ClipItemList.vue 行 2004 调用 `window.queuePersistDb()` 立即持久化，无延迟问题；但需确认收藏切换路径是否同样及时。
- 样式：[src/style/cpns/clip-item-list.less](../../../src/style/cpns/clip-item-list.less) 中 `.clip-time` 已有 `flex-shrink: 0`、`min-width: 0`、`overflow: hidden` 处理，但需确认图标区域在极端窄宽下是否仍会换行。

## 3. 设计方案
- **单一滚动决策入口**：凡由「当前 activeIndex 变更」触发的可视域修正，优先经由 `setKeyboardActiveIndex` → `scrollVirtualIndexIntoView` → `useVirtualListScroll.scrollToIndex`，避免在外部再直接调 `getListVirtualizer().scrollToIndex` 的平行路径（除非是 `scrollToBottom` 等显式语义）。
- **单击与长按分工**：
  - 单击：仅步进 ±1，对齐策略以 `nearest` 为主，首尾边界保留 `start`/`end` + `forceScroll`（与现实现接近，可收紧判断避免多余滚动）。
  - 长按：在确认「按住」后再启动定时分页（与首次单击步进解耦），分页跳转复用 `scrollByPage`（或与其等价的步长与 align 规则），目标项需落在视口内且选中样式明确；若贴近底部且无更多数据，按 Spec 可再评估 `scrollHalfPage` 半页兜底。
- **删除索引**：单条/已设置 `deleteAnchor` 的流程以子组件 `watch` 恢复为准；`Main` 侧删掉与之一致的重复 `adjustActiveIndexAfterDelete`，或对未设 anchor 的批量删除统一补一层「唯一恢复策略」（避免两条路径同时改写）。
- **锁/收藏 UI**：确认 [src/cpns/ClipItemRow.vue](../../../src/cpns/ClipItemRow.vue) 行头状态区布局（flex、最小宽度、`min-width: 0`、省略号），样式落在 [src/style/cpns/clip-item-list.less](../../../src/style/cpns/clip-item-list.less)；状态变更后继续走既有数据刷新链路，使父层 `showList` 与行 `item` 同步。

## 4. 受影响文件
- [src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue)：协调 `unifiedKeyHandler` / `startAutoScroll` / `list-nav-*`；按需让长按复用 `scrollByPage`；删除/多选相关 `watch` 与滚动调用次序。
- [src/views/Main.vue](../../../src/views/Main.vue)：收敛 `adjustActiveIndexAfterDelete` 使用场景；保证批量删除与 `deleteAnchor` 策略不打架。
- [src/hooks/useVirtualListScroll.js](../../../src/hooks/useVirtualListScroll.js)：若需统一 align 或暴露「仅判可见不滚」的辅助函数供多处调用，可小幅扩展（保持无新依赖）。
- [src/hooks/useListNavigation.js](../../../src/hooks/useListNavigation.js)：仅在 `deleteAnchor` 形状或清理时机需要与父组件协同时才改动。
- [src/cpns/ClipItemRow.vue](../../../src/cpns/ClipItemRow.vue)：行头状态区 DOM 结构与 class，确认图标挤换行问题（当前样式已较好，可能无需大改）。
- [src/style/cpns/clip-item-list.less](../../../src/style/cpns/clip-item-list.less)：紧凑行、状态图标、选中行样式微调（如需）。

## 5. 数据与状态变更
- 不新增持久化字段。
- 继续使用 `activeIndex`、`pendingNavAfterLoad`、`deleteAnchor`、`pendingHighlightedItemId` / `pendingActiveIndexAfterDelete`（多选删除）等既有 ref；目标是以单一流程为主、减少并行修正。

## 6. 接口与交互变更
- 不新增对外组件 props/emit 契约。
- 用户侧可感知：单步更稳、少「可见仍跳」；长按与 PageUp/PageDown 翻页感一致；删除后高亮不闪跳；锁/收藏图标在窄列表下不乱版。

## 7. 实施步骤
1. 梳理 `ClipItemList` 内方向键事件顺序（捕获热键与 `registerFeature` 的先后），确定短按不启长按定时器、长按延迟后与单步不重复的定时策略。
2. 将 `startAutoScroll` 的核心跳转改为调用 `scrollByPage`（或抽私有函数与之一致），统一页步长与 align；按需接 `scrollHalfPage` 兜底。
3. 审计 `Main` 中所有 `handleDataRemove` / 删除后的 `adjustActiveIndexAfterDelete`（行 755, 1097, 1528, 1562），按是否已 `setDeleteAnchor` 分类收敛。
4. 锁定/收藏切换路径核对：确认触发父级 `showList` 更新；缺则补 emit 或统一走 `handleDataRemove` 等价刷新。
5. `ClipItemRow` + Less：状态区布局与缩略确认，回归虚拟列表行高与 `measure` 行为（当前样式已较好，可能仅需微调）。
6. `pnpm run build` 与 Spec 中手工用例回归。

## 8. 测试与验证方案
- 命令：仓库根目录 [package.json](../../../package.json) 约定下执行 `pnpm run build`。
- 手工（`pnpm run serve`，主列表窗口）：
  - 上下键单步：项已在视口内完整可见时不应额外滚动；裁切或不可见时滚入视口。
  - 按住上/下键：进入分页式跳转，目标居中且选中清晰；底部无更多数据时行为符合 Spec。
  - 删除当前项、末项、批量删除、搜索批量删除：高亮连续、列表不整表闪烁。
  - `locked` 筛选下切换锁定；收藏Tab 约束不变。
  - 收窄窗口宽度，观察锁/收藏图标不换行、主文案可截断。

## 9. 风险与回滚点
- 事件捕获阶段与 `registerFeature` 的交互若改动不当，可能导致方向键无响应或重复触发。
- 删除路径收敛后，若某条分支未再调用刷新，可能出现列表数据旧而高亮新；需按分支测全。
- 回滚点：上述 Vue/LESS 文件的本次改动块；不涉及 `public/` 与 `src/global/` 热键注册表时回滚面较集中。

## 10. 待确认项
- 长按分页的 align 是否与 `list-page-up/down` 完全一致采用 `scrollByPage`（与当前 `startAutoScroll` 的全程 `center` 可能略有视觉差），以实现阶段试调为准。
- 半页兜底仅在「贴近底部/顶部仍体感卡住」时启用，避免改变常规分页手感。
- 样式文件当前已有较好的 flex 布局处理，需确认是否还需额外改动以解决图标换行问题。
