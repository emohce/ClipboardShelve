# Plan: 列表移动效果与删除状态修复

## 1. 变更目标
- 收敛 `ClipItemList` 中单步导航、长按连续导航、翻页与边界滚动的责任边界，保证所有高亮推进只服务于当前展示数组 `currentShowList`。
- 统一删除后的高亮恢复与列表回流，让普通删除、强制删除、取消收藏、多选删除在展示层与持久化层保持一致，不再出现错位、闪烁和残留选中态。
- 修正锁定/收藏状态的即时渲染与头部布局，在不改动数据模型的前提下让图标、时间、标签保持单行稳定展示。

## 2. 现状与根因
- 当前展示层存在两层列表语义：
  - [src/views/Main.vue](../../../src/views/Main.vue) 先维护 `showList` 与 `collectBlockList`，再组合出最终传给列表组件的展示结果。
  - [src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue) 内部所有导航、删除、选中都只感知传入的 `props.showList`。
  - 这意味着后续修复必须始终以最终展示列表为唯一真相，否则 `*` 搜索场景中顶部收藏块会再次打乱索引。
- 当前导航存在双重推进风险：
  - hotkey feature 中的 `list-nav-up/down` 负责 `activeIndex` 推进和滚动修正。
  - 捕获阶段的 `unifiedKeyHandler` 又会在普通 `ArrowUp/ArrowDown` 时启动 `startAutoScroll`。
  - 两套路径叠加，会让“单击一步”“长按分页”的语义互相覆盖。
- 当前滚动定位不够统一：
  - `useVirtualListScroll` 已实现“整项可见则不滚”的基础能力。
  - 但 `ClipItemList` 中不同入口传入的 `block` 策略、边界逻辑、加载更多后的恢复逻辑并不统一，导致单步、长按、翻页体验不一致。
- 当前删除恢复存在父子双侧竞争：
  - 子组件内已有 `deleteAnchor`、`pendingHighlightedItemId`、`pendingActiveIndexAfterDelete` 等恢复状态。
  - 父组件 [src/views/Main.vue](../../../src/views/Main.vue) 又保留了 `adjustActiveIndexAfterDelete` 之类的索引修正逻辑。
  - 同一条删除路径被两处恢复逻辑竞争时，就容易出现删除后先跳到 0 再跳回、或高亮与内容短暂不一致。
- 当前锁定与收藏头部渲染虽然已纳入 `v-memo` 依赖，但布局仍较脆弱：
  - 行头状态元素在 [src/cpns/ClipItemRow.vue](../../../src/cpns/ClipItemRow.vue) 中直接顺序平铺。
  - 图标、时间、标签并排时可压缩空间有限，容易在窄宽度下挤压主体内容或触发异常换行。

## 3. 设计方案
- 方案 A：统一导航入口
  - 保留 `registerFeature("list-nav-up/down")` 作为上下键导航唯一主入口。
  - 捕获阶段键盘监听仅保留 Shift 预览等非列表推进职责，不再对普通 `ArrowUp/ArrowDown` 自行启动第二套自动滚动。
- 方案 B：区分单步与长按滚动语义
  - 单步导航复用“目标项完整可见则不滚、不可见才滚”的判断，优先使用 `nearest/start/end` 的最小滚动策略。
  - 长按导航复用已有分页步长 `getPageStep()`，按分页式推进高亮，并使用中心对齐保证连续感知。
  - 边界场景只负责确保首项/末项完整可见；到底部时允许继续触发 `loadMore`，但不再用第二套推进逻辑补位。
- 方案 C：统一删除后的恢复责任
  - 删除前只保留必要元数据：当前展示列表中的 `anchorIndex`、高亮项 id、是否 batch、是否 force。
  - 删除后由父层 `Main.vue` 统一基于最新 `currentShowList` 计算目标索引并调用 `ClipItemListRef.setKeyboardActiveIndex`。
  - `ClipItemList.vue` 内部 watcher 不再承担第二套删除恢复职责，只保留多选集合和边界归一化。
- 方案 D：头部状态改为单行稳定布局
  - 保持 `ClipItemRow.vue` 现有结构，不新增抽象层，只把图标、日期、标签容器的压缩策略明确化。
  - 样式上保证图标不换行、日期胶囊不被挤爆、标签在剩余空间内缩略，主体内容区域维持 `min-width: 0`。
- 方案 E：性能优先复用已有 scroller 能力
  - 滚动定位优先使用现有虚拟列表能力和可见性判断，减少固定高度手工估算路径的触发频率。
  - 局部渲染继续依赖现有 `v-memo` 条件，不引入新依赖或大规模组件拆分。

## 4. 受影响文件
- [src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue)
  - 导航入口统一、滚动策略收敛、长按行为、删除恢复 watcher 精简、边界与 `loadMore` 衔接。
- [src/views/Main.vue](../../../src/views/Main.vue)
  - 删除后高亮恢复、展示列表与 `activeIndex` 同步、搜索/收藏混排场景的索引落点规则。
- [src/hooks/useVirtualListScroll.js](../../../src/hooks/useVirtualListScroll.js)
  - 可见性判断、对齐策略与滚动辅助能力的复用边界。
- [src/hooks/useListNavigation.js](../../../src/hooks/useListNavigation.js)
  - `deleteAnchor` 与待恢复高亮等导航状态的职责边界。
- [src/cpns/ClipItemRow.vue](../../../src/cpns/ClipItemRow.vue)
  - 行头状态结构与 class，避免图标挤换行。
- [src/style/cpns/clip-item-list.less](../../../src/style/cpns/clip-item-list.less)
  - 紧凑行、状态图标、标签缩略、选中行样式微调。

## 5. 数据与状态变更
- 不新增持久化字段，不改数据库结构。
- 继续复用现有状态：
  - `activeIndex`
  - `pendingNavAfterLoad`
  - `deleteAnchor`
  - `pendingHighlightedItemId`
  - `pendingActiveIndexAfterDelete`
  - `hoverPreviewSuspendedByKeyboard`
  - `selectedItemIdSet`
  - `showList` / `collectBlockList` / `currentShowList`
- 目标是收敛状态来源：
  - `activeIndex` 只通过统一导航入口变更。
  - `deleteAnchor` 只用于删除后的高亮恢复。
  - 长按自动滚动定时器成为唯一长按移动驱动。

## 6. 接口与交互变更
- 对外接口
  - 不新增组件 props/emits，不调整快捷键配置名，不修改 `public/` 或 `src/global/` 契约。
- 用户可见变化
  - `ArrowUp/ArrowDown` 单击：从“经常强行滚动”收敛为“可见则不滚，不可见才滚”。
  - `ArrowUp/ArrowDown` 长按：从潜在双重推进/逐项居中收敛为分页式连续移动并居中展示。
  - 删除后落点：统一为“原位置下一项优先，否则最后一项”，空列表安全归零。
  - 锁/收藏头部：状态即时刷新，图标与标签压缩后仍保持单行清晰可辨。

## 7. 实施步骤
1. 梳理并收敛 `ClipItemList.vue` 的键盘导航入口。
   - 明确 `list-nav-up/down`、`list-page-up/down`、捕获阶段 `keydown/keyup` 的职责边界。
   - 去除普通上下键的双重推进。
2. 调整滚动定位策略。
   - 为单步导航补上“完整可见则不滚”的判断。
   - 让长按导航复用分页步长与中心对齐。
   - 收缩固定高度估算兜底的触发条件。
3. 统一删除恢复模型到 `Main.vue`。
   - 基于 `anchorIndex + currentShowList` 计算删除后目标索引。
   - 精简 `ClipItemList.vue` 内部与删除恢复重叠的 watcher 逻辑。
4. 修正锁/收藏头部渲染与样式。
   - 保证状态更新立即反映到当前行。
   - 压缩图标/时间/标签布局，避免异常换行与主体内容挤压。
5. 做回归验证文档准备。
   - 把普通列表、收藏页、`*` 搜索、锁筛选、懒加载、多选删除、强制删除纳入 verify 基线。

## 8. 测试与验证方案
- 构建验证
  - `pnpm run build`
- 开发环境手工验证
  - `pnpm run serve`
  - 主界面普通 tab：单击 `ArrowUp/ArrowDown`，验证可见项不滚动、不可见项最小滚动。
  - 主界面普通 tab：长按 `ArrowUp/ArrowDown`，验证分页推进、边界停靠、底部懒加载衔接。
  - 删除路径：普通删除、强制删除、多选删除，验证高亮落点与内容一致。
  - 收藏页：取消收藏后高亮恢复正常，不误删真实数据。
  - 搜索路径：普通搜索、锁筛选、`*` 搜索混排下导航和删除不乱序。
  - 行头布局：锁图标、收藏图标、时间、标签并存时不换行挤爆。
- 插件环境说明
  - 若仅执行 `serve/build`，只能验证 Web 层行为；涉及 uTools 实际运行时的键盘与监听联动，需要在插件环境再补充一次人工验证。

## 9. 风险与回滚点
- 风险 1：收敛导航入口后，可能影响 Shift 预览、搜索态键盘层级或边界加载更多。
- 风险 2：删除恢复责任从子组件迁到父组件后，可能引入 tab 切换或懒加载边界回归。
- 风险 3：头部布局压缩可能影响当前列表项高度，间接触发虚拟滚动重测。
- 风险 4：`currentShowList` 混排场景下索引语义如果处理不彻底，`*` 搜索仍可能残留错位。
- 回滚点优先集中在：
  - [src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue) 的导航与删除恢复改动块
  - [src/views/Main.vue](../../../src/views/Main.vue) 的删除落点逻辑
  - [src/cpns/ClipItemRow.vue](../../../src/cpns/ClipItemRow.vue) 与 [src/style/cpns/clip-item-list.less](../../../src/style/cpns/clip-item-list.less) 的单行布局样式

## 10. 待确认项
- 默认按 spec 继续采用“长按 = 使用 `getPageStep()` 的分页式步长”推进；若后续任务阶段发现体感明显不符，再在 tasks 中细化。
- `300ms` 性能口径暂按“主界面列表状态变更后的可感知完成时间”理解；verify 阶段会明确写成本次实际采用的近似检查方式。
