# Feature: 列表移动效果优化

## 1. 目标
- 统一主列表键盘导航行为，收敛单步移动、长按连续移动、分页移动与边界滚动的规则，避免无意义滚动、强制错位居中和双重推进。
- 修复删除后选中态错乱、锁定/收藏状态刷新滞后、列表项头部图标换行挤压等问题，保证高亮、数据和渲染一致。
- 保证搜索、筛选、收藏混排和懒加载场景下的移动、删除、选中与滚动规则仍然稳定，不引入新的性能回归。

## 2. 背景
- 原始需求来自 [`docs/todo/260405-交互优化/移动效果优化/zt-move-原始需求.md`](../../docs/todo/260405-%E4%BA%A4%E4%BA%92%E4%BC%98%E5%8C%96/%E7%A7%BB%E5%8A%A8%E6%95%88%E6%9E%9C%E4%BC%98%E5%8C%96/zt-move-%E5%8E%9F%E5%A7%8B%E9%9C%80%E6%B1%82.md#L1)，核心诉求是“长按分页并居中、单步可见则不滚、删除后不乱、锁状态及时更新、单行渲染稳定”。
- 主界面当前实际展示列表由 [`src/views/Main.vue`](../../src/views/Main.vue#L922) 到 [`src/views/Main.vue`](../../src/views/Main.vue#L931) 组合 `showList` 与 `collectBlockList` 计算 `currentShowList`，说明导航和删除恢复必须基于最终展示列表，而不能只基于单一数据源。
- 列表导航、滚动定位、长按检测、删除、锁定、收藏等核心逻辑集中在 [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L1518) 到 [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L2433)，是本次问题的主入口。
- 当前已经存在“完全可见”判断 [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L1518)，但 `scrollActiveNodeIntoView` 在虚拟滚动分支会直接 `scrollToItem`，导致单步移动仍可能在目标项已可见时强制滚动 [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L1528)。
- 当前长按和方向键重复触发还存在两套自动滚动路径：`startKeyHoldAutoScroll` 与 `startAutoScroll` [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L1783) [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L2330)，容易造成分页语义不一致或重复推进。
- 删除后高亮恢复同时分布在 `ClipItemList` 内部 watcher 和 `Main.vue` 的 `adjustActiveIndexAfterDelete` 中 [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L1870) [`src/views/Main.vue`](../../src/views/Main.vue#L984)，是选中错乱和闪烁的直接风险点。
- 列表项头部图标、时间、标签在 [`src/cpns/ClipItemRow.vue`](../../src/cpns/ClipItemRow.vue#L19) 到 [`src/cpns/ClipItemRow.vue`](../../src/cpns/ClipItemRow.vue#L30) 串行渲染，配套样式在 [`src/style/cpns/clip-item-list.less`](../../src/style/cpns/clip-item-list.less#L184) 到 [`src/style/cpns/clip-item-list.less`](../../src/style/cpns/clip-item-list.less#L221)，已具备单行布局基础，但仍需进一步约束空间压缩和即时刷新。

## 3. 用户场景 / 使用场景
- 用户单击 `↑/↓` 逐项移动时，目标项已完全可见则列表不滚动；目标项部分露出或不可见时，列表只补充滚动到完全可见。
- 用户长按 `↑/↓` 连续浏览时，列表按半分页/分页式步长高性能跳转并居中展示当前项，不再逐项强制居中，不出现两套长按语义。
- 用户使用 `Ctrl+↑/Ctrl+↓` 分页时，行为应与长按分页一致，步长、滚动对齐和选中反馈保持统一。
- 用户删除当前高亮项后，默认落到原位置的下一项；若删除的是最后一项，则回退到新的最后一项；空列表时高亮安全归零。
- 用户切换锁定或收藏状态后，当前行图标和状态应立即刷新，不依赖再次导航才更新。
- 用户在普通列表、收藏页、`*` 搜索混排、锁筛选、懒加载场景中继续导航或删除时，高亮和展示结果必须保持一致，不出现“删的是 A，亮的是 B”。

## 4. 非目标
- 不重做虚拟列表方案，不引入新的滚动库或新的状态管理层。
- 不修改 `public/plugin.json`、`public/preload.js`、`public/listener.js` 等插件入口契约。
- 不扩展到预览层、设置页、搜索语法、收藏数据结构或快捷键配置体系的整体重构。
- 不在 spec 阶段承诺新增性能测试体系，只要求后续验证明确记录 `300ms` 目标的核验方式和结果。

## 5. 验收标准
- 单步导航时，目标项完全可见则不额外滚动；不完全可见时滚动到完全可见，高亮始终正确。
- 长按导航与 `Ctrl+↑/Ctrl+↓` 分页使用统一的半分页/分页步长与居中展示策略，不出现双重推进或互相打架的滚动。
- 列表顶部、底部、无更多数据、触发懒加载时，导航不越界、不抖动；底部加载新数据后高亮位置可预测。
- 删除单项、多项、强制删除、取消收藏后，`activeIndex`、展示数据和实际高亮一致，不出现明显闪烁、错位或残留选中态。
- 锁定/收藏状态在当前行及时更新，图标、时间、标签和正文保持单行稳定展示；空间不足时允许缩略，但不得异常换行挤爆内容区。
- 搜索、锁筛选、收藏混排场景下，导航、删除和选中恢复都基于当前展示列表，不因 `collectBlockList` 或数据来源切换而错乱。
- 常见列表状态变更后的滚动与高亮响应需满足需求提出的 `300ms` 目标，口径为“单次交互后 UI 达到滚动稳定且高亮正确的完成时间”；若未实测，验证文档必须明确标注未验证。

## 6. 边界与异常
- 空列表、仅一项、首项继续上移、末项继续下移时，行为必须安全退出，不允许越界索引和报错。
- 虚拟滚动尚未渲染出目标 DOM 节点时，滚动策略仍需保证最终目标项可见，不能因节点暂未挂载导致高亮错乱。
- 删除路径需继续区分普通删除、强制删除、取消收藏和多选删除，不能因为统一高亮恢复而破坏现有删除语义。
- 锁定项默认删除受限，强制删除例外；本次只修复状态同步和展示，不改变现有安全默认值。
- 搜索框聚焦、Shift 预览、多选、懒加载等现有键盘层级行为不能因导航收敛而被破坏。

## 7. 影响范围
- [`src/views/Main.vue`](../../src/views/Main.vue#L922)：`currentShowList` 计算、删除后高亮恢复、混排列表索引落点。
- [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L1518)：完全可见判定、滚动定位、单步/长按/分页导航、删除恢复、多选同步、懒加载衔接。
- [`src/cpns/ClipItemRow.vue`](../../src/cpns/ClipItemRow.vue#L19)：锁/收藏图标、时间、标签的单行渲染结构。
- [`src/style/cpns/clip-item-list.less`](../../src/style/cpns/clip-item-list.less#L184)：头部图标和标签压缩策略、选中态样式稳定性。
- [`specs/26040501-list-move/02-plan.md`](./02-plan.md#L1)：后续实现计划主文档。

## 8. 待确认项
- 长按与分页默认不再保留 `window.toTop()` 一类顶部兜底跳转，统一按半分页/分页式高性能响应处理。
- `300ms` 目标固定按“单次交互后 UI 达到滚动稳定且高亮正确的完成时间”理解；后续验证只需补充具体采样方式。
