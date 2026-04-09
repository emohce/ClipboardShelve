# Changelog

**排序**：永远把**最新**一轮更新写在**最上面**（新的 `## 日期 — 标题` 区块插在紧接本说明之后，旧区块整体下推）。  
**用户向发布摘要**（须同步维护）：见 [publishLog.md](publishLog.md)；写法与约束见 [vibe/ai-rules/06-change-log-format.md](vibe/ai-rules/06-change-log-format.md)。

## 2026-04-09 — 003-quick-item-operation（单条目别名 / 抽屉序号键迁移 / 别名保存触发）

### 变更摘要

- `F2`（`list-tag-edit`）从“仅收藏编辑”扩展为“单条目别名新增/更新入口”：收藏条目仍走原弹层；非收藏条目支持轻量别名输入并落到本地别名映射。
- 抽屉序号快捷执行从 `ctrl+shift+1..9` 迁移为 `ctrl+alt+1..9`，并在标签文案中明确新键位；抽屉序号越界时增加提示，防止误触发。
- 新增 `shift+Enter`（`list-save-by-alias`）：单文件且有别名时，复制临时重命名文件并粘贴；其他类型保持原复制粘贴路径。
- `ClipItemList` 增加别名解析优先级（本地别名映射 -> `remark` -> `alias` -> 首个 `tags`），并补充无条目/无别名提示。

### 关键文件

| 路径 | 作用 |
|------|------|
| [src/cpns/ClipItemList.vue](src/cpns/ClipItemList.vue) | `F2` 别名逻辑、`list-save-by-alias`、抽屉序号越界保护 |
| [src/global/hotkeyBindings.js](src/global/hotkeyBindings.js) | 新增 `shift+Enter`，迁移 `ctrl+alt+1..9` |
| [src/global/hotkeyLabels.js](src/global/hotkeyLabels.js) | 别名与新快捷键展示文案 |
| [src/utils/index.js](src/utils/index.js) | 单文件按别名重命名后粘贴能力 |
| [src/hooks/useClipOperate.js](src/hooks/useClipOperate.js) | 别名统一判定 helper |
| [docs/用户简明说明.md](docs/用户简明说明.md) | 用户可见快捷键说明更新 |

### 风险 / 兼容性影响

- 快捷键迁移会影响旧习惯（`ctrl+shift+num` -> `ctrl+alt+num`），需要用户适配。
- 单文件别名粘贴通过临时目录生成重命名副本，若临时文件路径不可写会回退默认粘贴并提示。
- 非收藏条目的别名当前走本地映射，不影响收藏弹层的数据结构。

### 验证状态

- 已完成：静态代码检查、编辑器 lints（本轮改动文件无报错）。
- 待你本机：在 uTools 环境按 `specs/003-quick-item-operation/quickstart.md` 执行三组手工场景验证。

### 知识沉淀状态

- 命中历史记录：无直接命中。
- 新增 Error Memory / ADR / Glossary：无。

## 2026-04-08 — 001-delete-search-nav-ux（删除 / 搜索 / IME / 列表导航 / 顶栏间距）

### 变更摘要

- **Speckit**：新增特性目录 [`specs/001-delete-search-nav-ux/`](specs/001-delete-search-nav-ux/)（`spec.md`、`plan.md`、`research.md`、`data-model.md`、`contracts/`、`quickstart.md`、`tasks.md`、`checklists/requirements.md`）；分支 `001-delete-search-nav-ux`。
- **删除与持久化**：`removeItemViaId` 成功后改为立即 `updateDataBaseLocal(..., { immediate: true })`，降低防抖窗口内丢盘、重进「像回滚」的风险（对齐 EM-2026-04-06-json-db-debounce-persist 思路）。
- **多选删除高亮**：`preferItemId` 仅在未删除的保留项中选取邻近 id，避免锚到待删项导致恢复异常。
- **搜索与 IME**：`Main.vue` 搜索已展开且在 `.clip-search` 内输入时不再 `window.focus()`；`ClipSearch` 组合输入与 `onEmpty` / reveal-guard 协调；`hotkeyRegistry` 在 `isComposing` 时不分发快捷键；`list-enter` / `list-ctrl-enter` 在搜索框聚焦或 `Process` 时短路。
- **列表键盘滚动**：近顶上移用小索引 `edge-align` + `end`；首项顶对齐配合 **`scrollTop = 0`**（避免 WebView 下 `scrollIntoView(block:start)` 误滚祖先导致首条「消失」）；`center-preferred` 对首尾索引优先 `start`/`end`。
- **主界面布局**：收紧 [`Main.vue`](src/views/Main.vue) `.clip-break` / `.clip-break--with-sub`（收藏 + 子标签）及空状态 `min-height`，减少固定顶栏与列表间无效大块空白。
- **知识库**：新增 [EM-2026-04-08-clipboard-nav-scroll-search-layout](vibe/vibe-doc/ai-error-memory/2026-04-08-clipboard-nav-scroll-search-layout.md)，更新 [vibe/ai-rules/00-error-memory.md](vibe/ai-rules/00-error-memory.md) 索引；`spec` / `research` / `plan` / `quickstart` 同步本轮约定与验证说明。

### 关键文件

| 路径 | 作用 |
|------|------|
| [src/global/initPlugin.js](src/global/initPlugin.js) | 删除后立即落盘 |
| [src/global/hotkeyRegistry.js](src/global/hotkeyRegistry.js) | `isComposing` 早退 |
| [src/views/Main.vue](src/views/Main.vue) | 搜索 `keydown` 焦点；`.clip-break` 高度 |
| [src/cpns/ClipSearch.vue](src/cpns/ClipSearch.vue) | IME / `onEmpty` / `compositionend` |
| [src/cpns/ClipItemList.vue](src/cpns/ClipItemList.vue) | 删除 anchor、`list-nav-up/down`、`list-enter` |
| [src/hooks/useVirtualListScroll.js](src/hooks/useVirtualListScroll.js) | 首项 `scrollTop=0`；首尾 `center-preferred` 分支 |
| [specs/001-delete-search-nav-ux/](specs/001-delete-search-nav-ux/) | 规格、计划、任务与验证 |
| [vibe/vibe-doc/ai-error-memory/2026-04-08-clipboard-nav-scroll-search-layout.md](vibe/vibe-doc/ai-error-memory/2026-04-08-clipboard-nav-scroll-search-layout.md) | 本轮交互与布局复盘 |
| [vibe/ai-rules/00-error-memory.md](vibe/ai-rules/00-error-memory.md) | EM 索引 |

### 风险 / 兼容性影响

- **删除立即写盘**：单次删除 IO 略增；批量删除仍为多次 `immediate`，极端大数据量时可再评估批量策略。
- **composition 全局短路**：组字期间不按热键，需符合中文输入预期。
- **`.clip-break` 高度**：若收藏子标签极多、窄窗多行折行，可能出现顶栏与列表轻度重叠或仍偏大缝，需按实机微调像素。
- **构建验证**：部分环境未跑通 `pnpm run build`，合并前建议在本地执行 [`pnpm run build`](package.json) 与 [`specs/001-delete-search-nav-ux/quickstart.md`](specs/001-delete-search-nav-ux/quickstart.md) 手工用例。

### 验证状态

- **已执行**：静态阅读与逻辑串联；`read_lints` 无报错文件。
- **未执行 / 待你本机**：uTools 内全量 quickstart（含 SC-001～004、顶栏间距 §6）；`pnpm run build`。

### 知识沉淀状态

- **命中历史记录**：采用 [EM-2026-04-06-json-db-debounce-persist](vibe/vibe-doc/ai-error-memory/2026-04-06-json-db-debounce-persist.md)、[EM-2026-04-06-scroll-path](vibe/vibe-doc/ai-error-memory/2026-04-06-scroll-path.md) 中的已确认通路思路。
- **新增 Error Memory**：[EM-2026-04-08-clipboard-nav-scroll-search-layout](vibe/vibe-doc/ai-error-memory/2026-04-08-clipboard-nav-scroll-search-layout.md)；索引已更新。
- **ADR**：无。
- **Glossary**：无。
- **其他**：Speckit 的 `update-agent-context` 可能曾向 [AGENTS.md](AGENTS.md) 追加特性栈摘要行（以文件 diff 为准）。

---
