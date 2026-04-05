# Feature: 列表移动效果优化

## 1. 目标

- 收敛主列表键盘导航行为，使单步移动、长按连续移动、翻页与边界滚动在同一套展示列表上表现一致，不再出现“可见项也强行滚动”“长按连续跳页错位”“删除后选中态漂移”。
- 修复删除、锁定、收藏图标渲染与选中态联动的错乱，确保删除后自动落点稳定、展示数据与持久化数据不混乱、列表不出现明显割裂或闪烁。
- 保持搜索、筛选、收藏结果混排与虚拟滚动场景下的高亮、可见性、性能一致性，列表常规渲染应满足需求文档中提出的 `300ms` 内完成展示的目标。

## 2. 背景

- 原始需求见 [`docs/todo/260405-交互优化/移动效果优化/zt-move-原始需求.md`](../../../docs/todo/260405-%E4%BA%A4%E4%BA%92%E4%BC%98%E5%8C%96/%E7%A7%BB%E5%8A%A8%E6%95%88%E6%9E%9C%E4%BC%98%E5%8C%96/zt-move-%E5%8E%9F%E5%A7%8B%E9%9C%80%E6%B1%82.md)。
- 当前主列表展示由 [`src/views/Main.vue#L119`](../../../src/views/Main.vue#L119) 到 [`src/views/Main.vue#L142`](../../../src/views/Main.vue#L142) 将 `currentShowList` 传入 [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue)，并在非收藏页额外渲染收藏结果块 [`src/views/Main.vue#L119`](../../../src/views/Main.vue#L119) 到 [`src/views/Main.vue#L124`](../../../src/views/Main.vue#L124)。
- 列表交互职责高度集中在 [`src/cpns/ClipItemList.vue#L1579`](../../../src/cpns/ClipItemList.vue#L1579) 到 [`src/cpns/ClipItemList.vue#L2237`](../../../src/cpns/ClipItemList.vue#L2237)，包括高亮索引、滚动定位、长按检测、删除、锁定、收藏等；仓库基线文档也明确该组件承担“选中态/焦点态异常、键盘上下移动行为、图片/文件预览体验”等问题的主入口，见 [`docs/VersionDesc/20260331-v0-当前版本架构与迭代基线说明.md#L288`](../../../docs/VersionDesc/20260331-v0-%E5%BD%93%E5%89%8D%E7%89%88%E6%9C%AC%E6%9E%B6%E6%9E%84%E4%B8%8E%E8%BF%AD%E4%BB%A3%E5%9F%BA%E7%BA%BF%E8%AF%B4%E6%98%8E.md#L288)。
- 当前单步移动通过 [`src/cpns/ClipItemList.vue#L1877`](../../../src/cpns/ClipItemList.vue#L1877) 到 [`src/cpns/ClipItemList.vue#L1957`](../../../src/cpns/ClipItemList.vue#L1957) 调整 `activeIndex`，但滚动策略混用了 `scrollIntoView`、`scrollToItem` 与固定高度估算兜底 [`src/cpns/ClipItemList.vue#L1579`](../../../src/cpns/ClipItemList.vue#L1579) 到 [`src/cpns/ClipItemList.vue#L1716`](../../../src/cpns/ClipItemList.vue#L1716)，容易让“可见则不滚、不可见才滚”的语义失稳。
- 当前长按上下键除了 hotkey feature 内的 `startKeyHoldAutoScroll` 外，还保留了捕获阶段的 `unifiedKeyHandler/startAutoScroll` 入口 [`src/cpns/ClipItemList.vue#L2360`](../../../src/cpns/ClipItemList.vue#L2360) 到 [`src/cpns/ClipItemList.vue#L2403`](../../../src/cpns/ClipItemList.vue#L2403)，与仓库历史修复记录中提到的“双重驱动风险”一致，见 [`docs/todo/260404-底层数据重构/Codex/260404-codex-Clipboard修复计划.md#L32`](../../../docs/todo/260404-%E5%BA%95%E5%B1%82%E6%95%B0%E6%8D%AE%E9%87%8D%E6%9E%84/Codex/260404-codex-Clipboard%E4%BF%AE%E5%A4%8D%E8%AE%A1%E5%88%92.md#L32)。
- 删除后高亮恢复当前分散在删除事件、`showList` watcher 和多选恢复逻辑中，见 [`src/cpns/ClipItemList.vue#L1816`](../../../src/cpns/ClipItemList.vue#L1816) 到 [`src/cpns/ClipItemList.vue#L1853`](../../../src/cpns/ClipItemList.vue#L1853)、[`src/cpns/ClipItemList.vue#L2154`](../../../src/cpns/ClipItemList.vue#L2154) 到 [`src/cpns/ClipItemList.vue#L2235`](../../../src/cpns/ClipItemList.vue#L2235)，与需求中的“删除 item 导致选中效果错乱、渲染错误”直接相关。
- 列表行头部状态目前由 [`src/cpns/ClipItemRow.vue#L20`](../../../src/cpns/ClipItemRow.vue#L20) 到 [`src/cpns/ClipItemRow.vue#L35`](../../../src/cpns/ClipItemRow.vue#L35) 直接串行渲染收藏图标、锁图标、时间、标签；原始需求要求锁状态及时更新且图标不挤压换行，因此本次需要把它视为受影响的用户可见区域。
- 针对“联网检索合理的高效实现”，已补充核验虚拟滚动上游资料：Akryum `vue-virtual-scroller` 官方仓库与发布记录都持续强调 `DynamicScroller`/`scrollToItem`/动态高度测量的定位边界；据此可推断后续 plan 需要优先复用现有 scroller 能力，减少基于固定 `44px` 的强估算滚动。这里是基于上游资料的推断，不构成当前 spec 的实现承诺。来源：[Akryum/vue-virtual-scroller](https://github.com/Akryum/vue-virtual-scroller)、[Releases](https://github.com/Akryum/vue-virtual-scroller/releases)。

## 3. 用户场景 / 使用场景

- 场景 1：用户在普通列表中单击 `↑/↓` 逐项移动时，如果目标项已完整可见，列表不应滚动；只有目标项进入可视区之外时，才补充滚动到刚好可见。
- 场景 2：用户长按 `↑/↓` 时，列表应复用现有“分页并居中”的导航模型，连续移动保持顺滑、可预测，不应每一帧都强制把单条 item 生硬居中。
- 场景 3：用户在顶部或底部边界继续长按时，列表应优雅停止或在允许加载更多的情况下按既有规则接续，不出现反复抖动、越界高亮或空滚动。
- 场景 4：用户删除当前高亮项后，列表应自动落到下一条；如果下一条不存在，则回落到新的最后一条；整个过程不应出现错误高亮、错误内容复用或明显闪烁。
- 场景 5：用户删除多选项、收藏页项或强制删除项后，展示层高亮与底层数据更新必须一致，不能出现“删的是 A，亮的是 B”或“持久化已变但列表暂时显示旧项”的错位。
- 场景 6：用户切换锁定状态或收藏状态后，图标、选中态、可删除状态需要立即反映到当前行，不需要依赖再次移动选中才刷新。
- 场景 7：用户在搜索、锁筛选、`*` 收藏混合搜索或懒加载场景中继续键盘导航时，高亮与滚动规则仍然作用于实际展示结果，不因顶部收藏结果块或筛选切换而错乱。

## 4. 非目标

- 不重做整个主界面架构，不改动 tab 体系、搜索语法、收藏数据模型和快捷键配置体系。
- 不新增依赖，不引入新的虚拟滚动库，不把列表组件整体拆成全新实现。
- 不修改 `public/plugin.json`、`public/preload.js`、`public/listener.js`；本次范围默认收敛在 `src/views/`、`src/cpns/` 及必要的现有样式文件。
- 不把预览层、抽屉层、设置页快捷键树等不直接属于“列表移动/删除/选中/锁状态渲染”的体验一并纳入本次必做项，除非后续 plan 证明与根因耦合。
- 不承诺在本次 spec 阶段内直接完成性能基准测试体系建设；本次只要求后续实现与验证明确给出 `300ms` 目标的可执行检查方式。

## 5. 验收标准

- 单步导航
  - 按一次 `↑/↓` 只触发一次明确的高亮变更。
  - 目标项已完整可见时，单步导航不额外滚动列表。
  - 目标项不可见时，列表只滚动到让该项可见，不出现超额跳动。
- 长按导航
  - 长按 `↑/↓` 使用统一的分页式连续移动规则，连续滚动时高亮项保持稳定可见。
  - 长按期间不应同时被第二套自动滚动逻辑再次推进，避免一次按键触发两套位移。
  - 边界处继续长按时，列表不抖动、不重复闪回；底部如触发 `loadMore`，新旧数据衔接后的高亮位置可预测。
- 删除与高亮恢复
  - 删除单条当前项后，优先选中原位置上的下一条；若越界则选中新列表最后一条；空列表时高亮安全归零。
  - 多选删除、强制删除、收藏页取消收藏等路径完成后，高亮、选择集合、展示内容保持一致，不出现残留选中态。
  - 删除动作不应造成明显的 UI 割裂或连续闪烁。
- 锁定与收藏状态渲染
  - 切换锁定后，当前行锁状态立即更新，不需依赖再次移动或重新进入列表。
  - 收藏图标、锁图标、时间、标签在单行头部内稳定排布；空间不足时允许缩略，但不应异常换行挤压主体内容。
- 搜索与筛选一致性
  - 搜索、锁筛选、收藏混合搜索下的键盘导航、删除恢复、选中态展示都基于当前展示列表，不因列表来源不同而失配。
  - 顶部收藏结果块存在时，不得破坏主列表的索引、高亮或删除落点规则。
- 性能与稳定性
  - 常规列表渲染与状态更新在用户可感知范围内应达到需求提出的 `300ms` 目标。
  - 列表移动、删除、锁定切换后，不应引入新的运行时错误、虚拟滚动错位或明显性能退化。

## 6. 边界与异常

- 空列表、仅一条数据、顶部/底部边界、懒加载无更多数据时，方向键行为必须安全退出，不能继续推进越界索引，参考 [`src/cpns/ClipItemList.vue#L1882`](../../../src/cpns/ClipItemList.vue#L1882) 到 [`src/cpns/ClipItemList.vue#L1888`](../../../src/cpns/ClipItemList.vue#L1888)、[`src/cpns/ClipItemList.vue#L1913`](../../../src/cpns/ClipItemList.vue#L1913) 到 [`src/cpns/ClipItemList.vue#L1941`](../../../src/cpns/ClipItemList.vue#L1941)。
- 虚拟滚动尚未渲染目标 DOM 节点时，滚动定位不能依赖单一元素查询失败后直接造成错误高亮；降级策略需要保证“至少可见”，不能制造新的半屏错位。这里是边界约束，不预设最终实现。
- 删除语义需继续区分“普通删除、取消收藏、清理、强制删除”，不能因统一高亮恢复而破坏现有删除规则，见 [`docs/VersionDesc/20260331-v0-当前版本架构与迭代基线说明.md#L422`](../../../docs/VersionDesc/20260331-v0-%E5%BD%93%E5%89%8D%E7%89%88%E6%9C%AC%E6%9E%B6%E6%9E%84%E4%B8%8E%E8%BF%AD%E4%BB%A3%E5%9F%BA%E7%BA%BF%E8%AF%B4%E6%98%8E.md#L422)。
- 锁定项默认删除受限，强制删除例外；本次只修复状态同步与展示，不改变安全默认值，参考 [`src/cpns/ClipItemList.vue#L2154`](../../../src/cpns/ClipItemList.vue#L2154) 到 [`src/cpns/ClipItemList.vue#L2197`](../../../src/cpns/ClipItemList.vue#L2197)。
- 搜索输入聚焦、Shift 预览、hover preview、多选等现有层级行为不能被列表导航修复破坏；尤其是捕获阶段键盘监听与 hotkeyRegistry 的协同路径需要保持功能兼容，参考 [`src/cpns/ClipItemList.vue#L2360`](../../../src/cpns/ClipItemList.vue#L2360) 到 [`src/cpns/ClipItemList.vue#L2450`](../../../src/cpns/ClipItemList.vue#L2450)。
- 由于收藏与普通历史分离存储，删除和取消收藏后的展示恢复必须避免把收藏项与普通项混淆，相关模型约束见 [`docs/VersionDesc/20260331-v0-当前版本架构与迭代基线说明.md#L145`](../../../docs/VersionDesc/20260331-v0-%E5%BD%93%E5%89%8D%E7%89%88%E6%9C%AC%E6%9E%B6%E6%9E%84%E4%B8%8E%E8%BF%AD%E4%BB%A3%E5%9F%BA%E7%BA%BF%E8%AF%B4%E6%98%8E.md#L145)。

## 7. 影响范围

- 主界面展示层：[`src/views/Main.vue#L119`](../../../src/views/Main.vue#L119)
  - `currentShowList` 传递、收藏结果块混排、删除/加载更多事件回流。
- 列表交互核心：[`src/cpns/ClipItemList.vue#L1579`](../../../src/cpns/ClipItemList.vue#L1579)
  - `activeIndex`、滚动定位、长按检测、删除恢复、锁定与收藏动作、高亮与多选同步。
- 列表项头部展示：[`src/cpns/ClipItemRow.vue#L20`](../../../src/cpns/ClipItemRow.vue#L20)
  - 收藏图标、锁图标、时间、标签的单行渲染与空间压缩。
- 样式文件：`src/style/cpns/clip-item-list.less`、`src/style/index.less` 或组件内关联样式
  - 仅在后续 plan 证明必要时增量调整，用于修复选中态、图标挤压、单行头部排布。
- 文档与验证：`specs/26040501-list-move/codex/`
  - 后续需基于本 spec 补齐 `02-plan.md`、`03-tasks.md`、`04-verify.md`。

## 8. 待确认项

1. “支持长按上下键分页并居中展示选中的 item”中的“分页”是否严格等同于当前 `PageUp/PageDown` 的步长模型，还是允许使用“半页”或其他固定步长，只要行为对用户可感知为分页式移动即可。
2. “页面渲染不要割裂闪烁”是否有明确可接受阈值；当前 spec 仅将其约束为肉眼可见闪烁不可接受，后续 verify 需要补成可执行检查口径。
3. “300ms 内渲染成功”是针对单次锁/收藏状态切换后的局部刷新，还是针对搜索/筛选后整列表首屏可交互完成时间；若不补充，后续验证只能采用代表性场景近似核验。
4. 原始需求中的“单步移动时 选中效果展示缺失, 排查是否是选中的在隐藏的范围”是否意味着当前已存在特定复现路径；若有固定场景，后续 plan 应把该复现路径写入验证基线。
