# Research: 003-quick-item-operation

## R-001 — `F2` 在收藏页与普通页的别名行为统一

**Decision**: 保留收藏页既有弹层入口，同时将 `F2` 绑定逻辑升级为“单条目别名新增/更新入口”；收藏页命中条件时优先走原弹层，再在弹层提交流程中复用别名写入。

**Rationale**: 规格要求“收藏页保留弹层逻辑且增加别名逻辑”，因此不能用新逻辑覆盖原路径。

**Alternatives considered**:
- 直接让 `F2` 全局仅走新别名流程：会破坏收藏页原有交互，拒绝。
- 收藏页完全不接入新别名能力：与 FR-002 冲突，拒绝。

## R-002 — 抽屉序号执行键迁移 `ctrl+shift+num -> ctrl+alt+num`

**Decision**: 在 [`src/global/hotkeyBindings.js`](../../src/global/hotkeyBindings.js) 仅替换 `list-drawer-sub-1..9` 的默认 `shortcutId`，并同步更新 [`src/global/hotkeyLabels.js`](../../src/global/hotkeyLabels.js) 的展示文案。

**Rationale**: 该项目已将快捷键映射集中到 `HOTKEY_BINDINGS`，最小改动路径是替换绑定定义，保持 feature id 不变。

**Alternatives considered**:
- 在 feature 侧兼容两套默认键位长期并行：增加歧义与维护成本，不符合“替换旧键”的目标。

## R-003 — `c-right` 抽屉序号与自动执行一致性

**Decision**: 继续复用 `openDrawerForCurrentItem(..., defaultActiveIndex)` 与 `list-drawer-sub-n` 机制，确保“展开列表显示顺序”与“序号快捷执行目标”使用同一 `fullMenu` 数据源。

**Rationale**: 现有代码中两者都指向 `getDrawerFullMenuItems`，风险在后续改动导致分叉；计划阶段明确要求后续任务增加契约化校验。

**Alternatives considered**:
- 为快捷执行单独维护序号数组：易与 UI 顺序漂移，拒绝。

## R-004 — 新增 `s-enter`（`shift+Enter`）触发别名保存

**Decision**: 新增独立 feature（例如 `list-save-by-alias`），绑定到 `shift+Enter`。执行分支：
1) 单文件 + 有别名：走“按别名重命名并粘贴”。
2) 其他类型（组合粘贴/纯文本等）：回退到现有组合粘贴执行链。

**Rationale**: 把“新键触发”与“原 Enter/ctrl+Enter 行为”隔离，可避免回归。

**Alternatives considered**:
- 复用 `list-ctrl-enter` 并在其中塞条件分支：会改变既有语义，回归面过大。

## R-005 — 相关未知项澄清

**Decision**: 规划阶段确认本次无 `NEEDS CLARIFICATION` 残留，细化为实现任务中的可验证项：
- “单文件”判定标准以 `item.type === "file"` 且仅包含 1 个文件路径为准。
- “有别名”判定复用当前条目标签字段（实现阶段在 `useClipOperate`/数据结构中落点确认）。

**Rationale**: 这些都可在现有代码与数据结构中得到可操作默认值，无需额外交互澄清。

**Alternatives considered**:
- 推迟到实现时临时定义：会导致任务拆分不可测，拒绝。
