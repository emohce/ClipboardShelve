# Plan: 列表移动效果优化

## 1. 变更目标

- 收敛 `ClipItemList` 中单步导航、长按连续导航、翻页与边界滚动的责任边界，保证所有高亮推进只服务于当前展示数组 `currentShowList`。
- 统一删除后的高亮恢复与列表回流，让普通删除、强制删除、取消收藏、多选删除在展示层与持久化层保持一致，不再出现错位、闪烁和残留选中态。
- 修正锁定/收藏状态的即时渲染与头部布局，在不改动数据模型的前提下让图标、时间、标签保持单行稳定展示。

## 2. 现状与根因

- 当前展示层存在两层列表语义：
  - `Main.vue` 中先维护 `showList` 和 `collectBlockList`，再组合出 `displayList/currentShowList`，见 [`src/views/Main.vue#L922`](../../../src/views/Main.vue#L922) 到 [`src/views/Main.vue#L931`](../../../src/views/Main.vue#L931)。
  - `ClipItemList.vue` 内部所有导航、删除、选中都只感知传入的 `props.showList`，见 [`src/cpns/ClipItemList.vue#L9`](../../../src/cpns/ClipItemList.vue#L9) 到 [`src/cpns/ClipItemList.vue#L64`](../../../src/cpns/ClipItemList.vue#L64)。
  - 这说明后续修复必须始终以 `currentShowList` 作为唯一展示真相，否则 `*` 搜索场景中顶部收藏块会再次打乱索引。
- 当前导航存在双重推进风险：
  - hotkey feature 中 `list-nav-up/down` 负责 `activeIndex` 推进和 `startKeyHoldAutoScroll`，见 [`src/cpns/ClipItemList.vue#L1877`](../../../src/cpns/ClipItemList.vue#L1877) 到 [`src/cpns/ClipItemList.vue#L1957`](../../../src/cpns/ClipItemList.vue#L1957)。
  - 捕获阶段 `unifiedKeyHandler` 又会在 `ArrowUp/ArrowDown` 时启动 `startAutoScroll`，见 [`src/cpns/ClipItemList.vue#L2375`](../../../src/cpns/ClipItemList.vue#L2375) 到 [`src/cpns/ClipItemList.vue#L2382`](../../../src/cpns/ClipItemList.vue#L2382)。
  - 这两套路径叠加，会让“单击一步”“长按分页”的语义被相互覆盖。
- 当前滚动定位不稳定：
  - `scrollActiveNodeIntoView` 先查 DOM，再调用 `scrollIntoView`，找不到节点时回退到 `scrollToItem` 或固定高度估算，见 [`src/cpns/ClipItemList.vue#L1490`](../../../src/cpns/ClipItemList.vue#L1490) 到 [`src/cpns/ClipItemList.vue#L1577`](../../../src/cpns/ClipItemList.vue#L1577)。
  - 兜底路径中仍保留“最多滚半屏”的人工限制，结合动态高度列表会制造“目标项未真正进入可视区但高亮已变更”的错觉。
- 当前删除恢复存在父子双侧竞争：
  - `ClipItemList` 在删除前记录 `pendingHighlightedItemId/pendingActiveIndexAfterDelete`，并在 `showList` watcher 中尝试恢复，见 [`src/cpns/ClipItemList.vue#L1816`](../../../src/cpns/ClipItemList.vue#L1816) 到 [`src/cpns/ClipItemList.vue#L1838`](../../../src/cpns/ClipItemList.vue#L1838)。
  - `Main.vue` 在 `handleItemDelete` 后又会执行 `adjustActiveIndexAfterDelete`，见 [`src/views/Main.vue#L984`](../../../src/views/Main.vue#L984) 到 [`src/views/Main.vue#L1058`](../../../src/views/Main.vue#L1058)。
  - 同一条删除路径被两处恢复逻辑竞争时，就容易出现删除后先跳到 0 再跳回、或高亮与内容短暂不一致。
- 当前锁定与收藏头部渲染虽然已纳入 `v-memo` 依赖，但布局仍比较脆弱：
  - 行头状态元素直接平铺在 `.clip-time` 中，见 [`src/cpns/ClipItemRow.vue#L20`](../../../src/cpns/ClipItemRow.vue#L20) 到 [`src/cpns/ClipItemRow.vue#L35`](../../../src/cpns/ClipItemRow.vue#L35)。
  - 样式上 `.clip-tags` 只有 `max-width: 80px`，图标、日期、标签并排时可压缩空间有限，见 [`src/style/cpns/clip-item-list.less#L171`](../../../src/style/cpns/clip-item-list.less#L171) 到 [`src/style/cpns/clip-item-list.less#L221`](../../../src/style/cpns/clip-item-list.less#L221)。

## 3. 设计方案

- 方案 A：统一导航入口
  - 保留 `registerFeature("list-nav-up/down")` 作为上下键导航唯一主入口。
  - 捕获阶段键盘监听仅保留 Shift 预览等非列表推进职责，不再对普通 `ArrowUp/ArrowDown` 自行启动第二套自动滚动。
- 方案 B：区分单步与长按滚动语义
  - 单步导航复用“目标项已完整可见则不滚、不可见才滚”的可见性判断，优先使用 `nearest/start/end` 级别的最小滚动。
  - 长按导航复用已有翻页步长 `getPageStep()`，按分页式推进高亮，并使用中心对齐保证用户连续感知。
  - 边界场景只负责确保首项/末项完整可见，底部允许继续触发 `loadMore`，但不再用第二套推进逻辑补位。
- 方案 C：统一删除后的恢复责任
  - 删除前只保留必要元数据：当前展示列表中的 `anchorIndex`、高亮项 id、是否 batch、是否 force。
  - 删除后由父层 `Main.vue` 统一基于最新 `currentShowList` 计算目标索引并调用 `ClipItemListRef.setKeyboardActiveIndex`。
  - `ClipItemList.vue` 内部 watcher 不再承担第二套删除恢复职责，只保留选择集合和边界归一化。
- 方案 D：头部状态改为单行稳定布局
  - 保持 `ClipItemRow.vue` 的当前结构，不新增抽象层，只把图标、日期、标签容器的压缩策略明确化。
  - 样式上保证图标不换行、日期胶囊不被挤爆、标签在剩余空间内缩略，主体内容区域维持 `min-width: 0`。
- 方案 E：性能优先复用已有 scroller 能力
  - 滚动定位优先使用 `DynamicScroller` 能力和可见性判断，减少固定 `44px` 手工估算路径的触发频率。
  - 局部渲染继续依赖现有 `v-memo` 条件，不引入新依赖或大规模组件拆分。

## 4. 受影响文件

- `specs/26040501-list-move/codex/01-spec.md`
  - 同步 feature-id 路径，作为 plan/tasks/verify 的上游基线。
- `specs/26040501-list-move/codex/02-plan.md`
  - 本次计划文档。
- `src/cpns/ClipItemList.vue`
  - 导航入口统一、滚动策略收敛、长按行为、删除恢复 watcher 精简、边界与 loadMore 衔接。
- `src/views/Main.vue`
  - 删除后高亮恢复、展示列表与 activeIndex 同步、搜索/收藏混排场景的索引落点规则。
- `src/cpns/ClipItemRow.vue`
  - 行头状态的结构微调或语义补强，确保锁/收藏状态即时展示。
- `src/style/cpns/clip-item-list.less`
  - 行头状态单行排布、标签缩略、选中态视觉稳定性修正。

## 5. 数据与状态变更

- 不改动 `window.db` 数据模型，不改动收藏与普通历史分离存储规则。
- 重点调整的运行期状态：
  - `activeIndex`
    - 来源：`ClipItemList.vue`
    - 生命周期：列表组件内维护，通过 `defineExpose` 暴露给父层
    - 目标：只由一套导航与一套删除恢复路径主控
  - `pendingNavAfterLoad`
    - 来源：`ClipItemList.vue`
    - 生命周期：底部触发 `loadMore` 时短暂存在
    - 目标：保留其“等待新增数据后跳转”的职责，但避免与长按/删除恢复混淆
  - `pendingHighlightedItemId` / `pendingActiveIndexAfterDelete`
    - 来源：`ClipItemList.vue`
    - 目标：后续实现阶段评估是否删除或降权，只保留一种恢复策略
  - `showList` / `collectBlockList` / `currentShowList`
    - 来源：`Main.vue`
    - 生命周期：搜索、筛选、tab 切换、懒加载、删除后重算
    - 目标：任何导航和删除恢复都基于最终的 `currentShowList`
  - `lockFilter` / `filterText`
    - 来源：`Main.vue`
    - 目标：确认搜索和锁筛选变化后，高亮重置与恢复策略不会引入错位

## 6. 接口与交互变更

- 对外接口
  - 不新增组件 props/emits，不调整快捷键配置名，不修改 `public/` 或 `src/global/` 契约。
- 用户可见交互
  - `↑/↓` 单击：从“经常强行滚动”收敛为“可见则不滚，不可见才滚”。
  - `↑/↓` 长按：从潜在双重推进/逐项居中收敛为分页式连续移动并居中展示。
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
  - 主界面普通 tab：单击 `↑/↓`，验证可见项不滚动、不可见项最小滚动。
  - 主界面普通 tab：长按 `↑/↓`，验证分页推进、边界停靠、底部懒加载衔接。
  - 删除路径：普通删除、强制删除、多选删除，验证高亮落点与内容一致。
  - 收藏页：取消收藏后高亮恢复正常，不误删真实数据。
  - 搜索路径：普通搜索、锁筛选、`*` 搜索混排下导航和删除不乱序。
  - 行头布局：锁图标、收藏图标、时间、标签并存时不换行挤爆。
- 插件环境说明
  - 若仅执行 `serve/build`，只能验证 Web 层行为；涉及 uTools 实际运行时的键盘与监听联动，需要在插件环境再补充一次人工验证。

## 9. 风险与回滚点

- 风险 1：收敛导航入口后，可能影响 Shift 预览或搜索态键盘层级。
  - 回滚点：恢复捕获阶段对普通上下键的旧处理，但保留新加的单步可见性判断。
- 风险 2：删除恢复责任从子组件迁到父组件后，可能引入 tab 切换或懒加载边界回归。
  - 回滚点：保留现有 `adjustActiveIndexAfterDelete` 接口形态，先做小范围责任迁移，必要时逐步恢复内部 watcher 兜底。
- 风险 3：头部布局压缩可能影响当前列表项高度，间接触发虚拟滚动重测。
  - 回滚点：样式调整保持增量、小范围 scoped，必要时先只修复图标不换行，不调整整体高度。
- 风险 4：`currentShowList` 混排场景下索引语义如果处理不彻底，`*` 搜索仍可能残留错位。
  - 回滚点：在实现阶段先加入该场景的人工回归用例，发现异常时优先回退混排相关索引修正。

## 10. 待确认项

- 默认按 spec 继续采用“长按 = 使用 `getPageStep()` 的分页式步长”推进；若你对“分页”有更具体定义，tasks 前可以再收窄。
- `300ms` 性能口径暂按“主界面列表状态变更后的可感知完成时间”理解；verify 阶段会明确写成本次实际采用的近似检查方式。
