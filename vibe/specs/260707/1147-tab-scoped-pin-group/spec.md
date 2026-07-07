# Tab Scoped Pin Group Spec

Tool: codex

## Summary

把置顶组合从“单个全局组合”改为“按顶层 Tab type 独立保存和展示”。在“全部”保存的组合只在“全部”展示；“图片”保存的组合只在“图片”展示；全局 `quick-paste-pin-group` 读取最后记忆 Tab 对应的组合。

## Knowledge Context

Required:

- [Project status hub](../../PROJECT_STATUS.md)
- [Project memory index](../../../knowledge/MEMORY_INDEX.md)
- [Quick paste runtime](../../../knowledge/quick-paste-runtime.md)
- [Quick paste pin group cache](../../../knowledge/quick-paste-pin-group-cache.md)
- [UI interaction guardrails](../../../vibe-doc/ai-error-memory/2026-06-09-ui-structure-interaction-guardrails.md)
- [Storage performance pitfalls](../../../vibe-doc/ai-error-memory/2026-06-09-storage-performance-rewrite-pitfalls.md)

Current implementation evidence:

- [src/storage/pinnedItems.js](../../../../src/storage/pinnedItems.js#L86-L133) stores one global `pin.group`.
- [src/views/Main.vue](../../../../src/views/Main.vue#L1210-L1269) inserts the same synthetic group item into every current list and syncs one cache.
- [src/global/quickPasteRuntime.js](../../../../src/global/quickPasteRuntime.js#L149-L202) holds one `pinGroupRuntimeCache` and falls back to one `getPinGroup()`.

## Requirements

1. `pin.group` storage must represent each top-level Tab type independently: `collect`、`all`、`text`、`image`、`file`.
2. Saving a group from the current Tab updates only that Tab bucket and sets the current group type to that Tab.
3. Clearing a group from a synthetic group row clears only the current Tab bucket.
4. The synthetic group row appears only when the active Tab has a non-empty group.
5. Global `quick-paste-pin-group` uses `pin.lastActiveContext.tab` to choose the bucket. If no bucket exists for that Tab, it should hide the uTools window and not fall back to another Tab group.
6. Runtime cache must support multiple Tab buckets and keep enough metadata to identify the current type, item ids, cursor, updated time, and resolved pasteable entries.
7. Deleting underlying items removes them from every group bucket, because item ids are global records.
8. Legacy single-group storage must be read safely. Because old storage has no origin type, migrate it conservatively to `all`.
9. Runtime cache must be real-time synchronized by authoritative UI/storage mutations, not by global hotkey side effects. Global hotkeys consume cache and may advance the matching cursor, but must not clear the full cache envelope.
10. New Pad / Tab / Type projection concepts must not be treated as cache reset boundaries. They may map to a bucket or projection, but cache invalidation must stay explicit and scoped.

## Non-Goals

- Do not introduce multiple named groups per Tab.
- Do not split `collect` by收藏子标签.
- Do not change single-item pin behavior.
- Do not change quick-paste top-item selection semantics.
- Do not add DB schema or SQL migration.

## Implementation Sync

| Layer | Current | Target |
| --- | --- | --- |
| Storage | One `pin.group` object | `pin.group` envelope with `currentType` and `groups[type]` buckets |
| Main UI | One `pinGroup` ref displayed in all Tabs | Current Tab reads/writes only its own bucket |
| Runtime cache | One `pinGroupRuntimeCache` | Cache envelope stores per-Type caches plus current Type |
| Global trigger | `getPinGroup()` fallback | `getLastActiveContext().tab` -> matching bucket only |
| Docs/tests | Existing global-group docs | Update runtime docs and shortcut test coverage |

## Cache Invariant

- Cache owner: Main/runtime synchronization code that observes pin/group storage and relevant item membership changes.
- Cache consumer: global quick-paste hotkeys.
- Allowed hotkey mutation: advance the selected bucket cursor after a successful loop paste.
- Forbidden hotkey mutation: clearing whole cache, clearing unrelated buckets, rebuilding all buckets because one bucket misses, or using Pad / Tab / Type projection changes as invalidation.

## Task Overview Sidecar

任务规则声明:

- 全局入口: CodeNote `VibeAi.md` 已读取。
- 项目入口: `AGENTS.md`、`vibe/rules/README.md`、`context-loading.md`、`documentation.md`、`workflow.md`、`knowledge.md`、`PROJECT_STATUS.md` 已读取。
- Sidecar: 主线程。
- 文档路由: 需求更新、业务逻辑更新、文档同步；无技术栈更新；错误记录待 Closeout 判定；DB-SQL 无。
- 高风险门禁: 不涉及 DB 写 SQL、发布、外部服务写入、凭据或生产变更。

## Evolution Candidate

| Evidence | Candidate | Target | Promotion Condition | Risk | Decision |
| --- | --- | --- | --- | --- | --- |
| 用户明确要求分组按 Tab type 独立 | “置顶组合是 Tab-scoped，不是全局展示项” | `quick-paste-runtime.md` / `quick-paste-pin-group-cache.md` | 代码和测试验证通过 | 旧文档继续误导后续实现 | 已更新 |
