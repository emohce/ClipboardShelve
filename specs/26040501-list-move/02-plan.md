# Plan: 列表移动效果优化

## 1. 变更目标
- 收敛列表导航的唯一行为语义：单步移动遵循“完全可见则不滚，不可见才滚”，长按分页与 `Ctrl+↑/Ctrl+↓` 分页对齐为同一套半分页/分页步长和居中策略。
- 统一删除后的高亮恢复责任，避免父子组件同时竞争索引修正，解决删除后选中错位、闪烁和展示错乱。
- 修正锁定/收藏状态的即时刷新与头部布局压缩，保证单行展示稳定且不引入明显性能退化。

## 2. 现状与根因
- `currentShowList` 由 [`src/views/Main.vue`](../../src/views/Main.vue#L922) 到 [`src/views/Main.vue`](../../src/views/Main.vue#L931) 组合生成，但 `ClipItemList` 内部导航与删除逻辑只直接消费 `props.showList`，因此任何恢复策略都必须明确以最终展示列表为准。
- `scrollActiveNodeIntoView` 已有 DOM 分支的“完全可见则跳过滚动”判断，但虚拟滚动分支会直接 `scrollToItem` 后返回 [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L1528)，导致单步移动在可见场景下仍可能强制滚动。
- 长按路径同时存在 `startKeyHoldAutoScroll` 和 `startAutoScroll` 两套推进逻辑 [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L1783) [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L2330)，而 `list-page-up/down` 也各自维护分页规则 [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L2012)，形成三处分叉；其中顶部 `window.toTop()` 还是额外的边界语义源。
- 删除恢复逻辑既在 `ClipItemList` 的 `pendingHighlightedItemId/pendingActiveIndexAfterDelete` watcher 中处理 [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L1870)，又在 `Main.vue` 里通过 `adjustActiveIndexAfterDelete` 处理 [`src/views/Main.vue`](../../src/views/Main.vue#L984)，存在覆盖顺序和双重跳转风险。
- 锁定操作分为多选批量内存更新和单项 `window.setLock` 两条路径 [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L2183)，行头布局虽然已有 `flex` 和 `ellipsis` 基础样式 [`src/style/cpns/clip-item-list.less`](../../src/style/cpns/clip-item-list.less#L184)，但图标、时间、标签的压缩边界仍不够明确。

## 3. 设计方案
- 统一滚动判定：
  - 在 `setKeyboardActiveIndex` / `scrollActiveNodeIntoView` 维持现有接口基础上补充“最小滚动”语义。
  - 单步导航先判断目标项是否已对当前滚动容器完全可见；若已可见则跳过滚动，否则再执行 `scrollToItem` 或 `scrollIntoView`。
  - 分页导航继续允许强制滚动，并使用居中策略保证连续浏览的一致感。
- 统一分页导航：
  - 抽出公共分页函数，统一复用半分页/分页步长计算目标索引，优先保证高性能响应。
  - `list-page-up/down`、长按分页、重复按键分页都走同一套“目标索引 + block/align”逻辑，避免多套步长和边界处理。
  - 移除 `window.toTop()` 这类额外顶部兜底语义，顶部边界只保留统一的半分页/分页响应与可见性控制。
- 收敛删除恢复：
  - 父层 `Main.vue` 继续作为展示列表真相源，在删除后基于最新 `currentShowList` 计算目标索引。
  - 子层 `ClipItemList.vue` 只保留必要的边界归一化和多选同步，删除恢复 watcher 需要降权或移除重复职责，避免双写。
  - 删除恢复规则统一为“原位置优先落下一条，越界则落最后一条，空列表归零”。
- 稳定行头渲染：
  - 保持 [`src/cpns/ClipItemRow.vue`](../../src/cpns/ClipItemRow.vue#L19) 现有结构，不新增抽象层，只强化图标不收缩、标签和正文可缩略、容器最小宽度为 0 的约束。
  - 确保锁定/收藏状态变化直接驱动当前行渲染，不依赖再次移动高亮才能刷新。

## 4. 受影响文件
- [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L1518)：统一完全可见判定、滚动策略、分页入口、长按逻辑、删除恢复职责边界。
- [`src/views/Main.vue`](../../src/views/Main.vue#L984)：删除后索引恢复、`currentShowList` 下的高亮落点和懒加载衔接。
- [`src/cpns/ClipItemRow.vue`](../../src/cpns/ClipItemRow.vue#L19)：行头状态展示结构检查，确认即时刷新路径。
- [`src/style/cpns/clip-item-list.less`](../../src/style/cpns/clip-item-list.less#L184)：图标、时间、标签和正文的单行压缩样式。
- [`specs/26040501-list-move/01-spec.md`](./01-spec.md#L1)：本计划对应的需求基线。

## 5. 数据与状态变更
- 不新增持久化字段，不改动 `window.db` 数据结构、收藏存储模型或快捷键注册表。
- 重点关注的运行期状态：
  - `activeIndex`：列表当前高亮索引，后续只允许一套导航和一套删除恢复主控。
  - `pendingNavAfterLoad`：底部触发 `loadMore` 后的临时导航状态，需避免与分页/删除恢复混淆。
  - `pendingHighlightedItemId` / `pendingActiveIndexAfterDelete`：评估是否保留为多选删除辅助态，避免继续承担通用删除恢复职责。
  - `showList` / `collectBlockList` / `currentShowList`：所有恢复和导航均以最终展示结果为准。

## 6. 接口与交互变更
- 不新增组件 `props` / `emits`，优先在现有内部函数参数层面收敛行为。
- 用户可见交互变化：
  - 单击 `↑/↓`：从“经常强制滚动”变为“可见则不滚，不可见才最小滚动”。
  - 长按 `↑/↓`：从逐项/双路径推进收敛为半分页/分页步长连续移动并居中展示。
  - 删除后落点：统一为下一项优先、越界取最后一项、空列表归零。
  - 锁/收藏图标：状态即时刷新，头部单行稳定展示。

## 7. 实施步骤
1. 梳理 `ClipItemList.vue` 中单步、长按、分页、重复按键的调用链，确认保留的唯一分页入口。
2. 调整 `scrollActiveNodeIntoView` 与 `setKeyboardActiveIndex`，统一虚拟滚动分支和 DOM 分支的“完全可见则跳过滚动”判定。
3. 抽取公共分页函数，替换 `list-page-up/down`、`startKeyHoldAutoScroll`、`startAutoScroll` 中重复的分页推进逻辑。
4. 收敛删除恢复责任：以 `Main.vue` 为主修正删除后落点，精简 `ClipItemList.vue` 中重复的 watcher 恢复逻辑。
5. 校正 `ClipItemRow.vue` 与 `clip-item-list.less` 的单行压缩策略，确保锁/收藏状态及时刷新且不换行挤压正文。
6. 补充验证记录，覆盖普通列表、收藏页、`*` 搜索、锁筛选、懒加载、多选删除、强制删除等场景。

## 8. 测试与验证方案
- 构建验证：
  - `pnpm run build`
- 开发环境手工验证：
  - `pnpm run serve`
  - 普通列表：单击 `↑/↓`，验证完全可见时不滚、不可见时最小滚动。
  - 长按 `↑/↓` 与 `Ctrl+↑/Ctrl+↓`：验证半分页/分页步长、居中和边界行为一致，不再触发 `window.toTop()` 式顶部跳转。
  - 删除路径：普通删除、强制删除、多选删除、取消收藏后验证高亮落点和内容一致。
  - 搜索与筛选：普通搜索、锁筛选、`*` 混排场景下验证导航和删除不乱序。
  - 布局：锁图标、收藏图标、时间、标签并存时验证单行展示和缩略。
  - 性能口径：以“单次交互后 UI 达到滚动稳定且高亮正确的完成时间”核验 `300ms` 目标。
- 插件环境说明：
  - 若只执行 `serve/build`，只能验证 Web 层行为；涉及 uTools 实际键盘事件链路时，需在插件环境补充人工验证。

## 9. 风险与回滚点
- 收敛导航入口并移除 `window.toTop()` 后，可能影响 Shift 预览、搜索框聚焦、顶部边界手感或现有热键消费顺序；如有回归，应优先回滚键盘入口合并部分。
- 删除恢复从父子双写改为单主控后，可能在多选、懒加载、tab 切换场景暴露新的边界问题；必要时可先保留子组件兜底，但避免重复设置索引。
- 行头压缩样式如果影响列表项高度，可能触发虚拟滚动重测量；样式修改应保持增量，并优先保证不改变整体行高。
- 回滚优先级：
  1. 回滚分页入口统一改动。
  2. 回滚删除恢复职责调整。
  3. 回滚行头样式压缩改动。

## 10. 待确认项
- `300ms` 目标的采样方式建议写入后续 `04-verify.md`；当前 plan 已固定验收口径为“单次交互后 UI 达到滚动稳定且高亮正确的完成时间”。
