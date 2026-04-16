# Error Memory: EM-2026-04-16-lock-action-refresh-path

## 1. 背景与症状

- **直接症状**：
  - `ctrl+u` / `ctrl+Enter` 后，锁图标反馈慢，用户误判为“快捷键没触发”。
  - 刚执行加锁后，紧接着继续方向键移动，体感会“卡一下”或要等较久。
- **涉及路径**：
  - 单条目加锁：[`src/cpns/ClipItemList.vue#L2328`](../../src/cpns/ClipItemList.vue#L2328)
  - `ctrl+Enter` 自动加锁：[`src/cpns/ClipItemList.vue#L2203`](../../src/cpns/ClipItemList.vue#L2203)
  - 父层刷新链：[`src/views/Main.vue#L1006`](../../src/views/Main.vue#L1006)、[`src/views/Main.vue#L636`](../../src/views/Main.vue#L636)

## 2. 错误归类

- `runtime-path-mismatch`
- `root-cause-misread`
- `invalid-verification`

## 3. 误判链路

- 先怀疑 **快捷键监听丢失**，但实际 `ctrl+Enter` / `ctrl+u` 绑定与分发链仍在：
  - [`src/global/hotkeyBindings.js#L266`](../../src/global/hotkeyBindings.js#L266)
  - [`src/global/hotkeyBindings.js#L270`](../../src/global/hotkeyBindings.js#L270)
- 把“加锁后移动慢”误判成 **`setLock` 持久化太慢**；实际上 [`DB.setLock`](../../src/global/initPlugin.js#L462) 只改内存并调用 [`queuePersist`](../../src/global/initPlugin.js#L329)，后者只是更新时间并走防抖写盘，不是主阻塞点。
- 把“图标不立即更新”和“加锁后移动卡顿”当成同一个 Vue 渲染问题，忽略了 **父层整表刷新链**。

## 4. 已证伪方案

- 继续沿“监听器坏了 / 热键没触发”的方向排查。
- 为了让 UI 立刻更新，只靠 `emit("onDataRemove")` 强制父层重建列表。
- 把 `copyAndPasteAndExit(...)` 视为加锁链上的唯一慢点，而忽略加锁后紧接的列表重算。

## 5. 已确认通路

- **真实加锁链**：
  - `ctrl+Enter`：[`list-ctrl-enter`](../../src/cpns/ClipItemList.vue#L2203) -> 先走 [`setItemLockedState`](../../src/cpns/ClipItemList.vue#L1746) 同步当前 `showList` 锁态 -> 再执行 `copyAndPasteAndExit(...)`。
  - `ctrl+u`：[`list-lock`](../../src/cpns/ClipItemList.vue#L2328) -> 单条目走 [`setItemLockedState`](../../src/cpns/ClipItemList.vue#L1746)，多选走 [`setItemsLockedState`](../../src/cpns/ClipItemList.vue#L1756)。
- **即时 UI 反馈来源**：真正让图标立刻变化的，不是父层刷新，而是组件内直接修改 `showList` 对应项：
  - [`syncShowListLockedState`](../../src/cpns/ClipItemList.vue#L1739)
- **独立渲染原则**：锁图标刷新应优先依赖 **当前 `showList` item 自身状态**，单条目与多选都应先在子组件内部完成局部更新；父层 `handleDataRemove` 只负责“当前筛选结果成员发生变化”的情况，不应承担普通锁图标刷新。
- **实际慢点**：加锁后若继续触发 [`emit("onDataRemove")`](../../src/cpns/ClipItemList.vue#L2350)，父层会走：
  - [`handleDataRemove`](../../src/views/Main.vue#L1006) -> [`updateShowList`](../../src/views/Main.vue#L636)
  - 该链会重算当前 tab、锁筛选、搜索条件，并重建 `showList`，这是“加锁后继续移动发涩”的高成本来源。
- **当前推荐分流**：[`list-lock`](../../src/cpns/ClipItemList.vue#L2336) 默认只走 item 级锁态同步；仅当 `lockFilter === "locked"` 时，才额外 `emit("onDataRemove")` 让父层把进出结果集的条目移除或补入。
- **数据库写入语义**：[`DB.setLock`](../../src/global/initPlugin.js#L462) / [`DB.setLocks`](../../src/global/initPlugin.js#L472) 是“内存立即更新 + 防抖持久化”，默认不该作为交互延迟的第一嫌疑点。

## 6. 适用触发条件

| 维度 | 说明 |
|------|------|
| 路径 / 模块 | `src/cpns/ClipItemList.vue`, `src/views/Main.vue`, `src/global/initPlugin.js` |
| 症状关键词 | `ctrl+u`, `ctrl+Enter`, lock, locked, onDataRemove, handleDataRemove, updateShowList, 加锁后移动慢 |
| 关键 API | `setLock`, `setLocks`, `queuePersist`, `onDataRemove`, `copyAndPasteAndExit` |
| 运行环境 | `uTools` 插件窗口 |

## 7. 禁止再试的做法

- 未确认父层是否真的需要重建列表前，就在加锁后无条件 `emit("onDataRemove")`。
- 把“加锁后移动慢”直接归咎于 JSON 持久化或热键监听。
- 为了追求即时反馈，再次引入散点 `forceUpdate` / `listKey` / 重建整表。
- 把普通锁图标刷新继续绑定到父层 `handleDataRemove`，而不是让单/批量 item 自主更新。

## 8. 推荐优先策略

- **先分开看两类问题**：
  - 图标/锁态是否立即变化：先看 [`syncShowListLockedState`](../../src/cpns/ClipItemList.vue#L1739) 是否命中。
  - 加锁后继续导航是否发涩：先看是否触发了 [`handleDataRemove`](../../src/views/Main.vue#L1006) 整表刷新。
- **默认策略**：加锁操作优先走“当前 `showList` 乐观同步 + DB 防抖持久化”，不要先整表重建。
- **渲染职责划分**：锁图标刷新优先在子组件内部按 item 独立渲染；父层只在筛选结果成员变化时参与。
- **只有当当前筛选结果成员会变化时**，才考虑触发父层刷新；例如锁筛选为“仅看已锁定”且当前操作会让条目进出结果集。
- 若 `ctrl+Enter` 体感慢，先核对锁定是否排在 [`copyAndPasteAndExit`](../../src/utils/index.js#L302) 前面，而不是先怀疑 `setLock`。

## 9. 关联文件 / 模块

- [`src/cpns/ClipItemList.vue#L1731`](../../src/cpns/ClipItemList.vue#L1731)
- [`src/cpns/ClipItemList.vue#L2203`](../../src/cpns/ClipItemList.vue#L2203)
- [`src/cpns/ClipItemList.vue#L2328`](../../src/cpns/ClipItemList.vue#L2328)
- [`src/cpns/ClipItemList.vue#L2336`](../../src/cpns/ClipItemList.vue#L2336)
- [`src/views/Main.vue#L636`](../../src/views/Main.vue#L636)
- [`src/views/Main.vue#L1006`](../../src/views/Main.vue#L1006)
- [`src/global/initPlugin.js#L329`](../../src/global/initPlugin.js#L329)
- [`src/global/initPlugin.js#L462`](../../src/global/initPlugin.js#L462)
- [`src/utils/index.js#L302`](../../src/utils/index.js#L302)

## 10. 后续观察点

- 是否仍存在“加锁后无条件整表刷新”的其他旁路。
- 锁筛选为 `locked` 时，解锁动作是否需要更细粒度地移除当前项，而不是全量重算。
- 多选加锁后若立即继续导航，选择集保留与高亮恢复是否还有额外延迟源。
