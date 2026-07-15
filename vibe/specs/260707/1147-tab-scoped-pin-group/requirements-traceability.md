# Tab Scoped Pin Group Traceability

Tool: codex

| Requirement | Code Target | Test Target | Doc Target |
| --- | --- | --- | --- |
| 分组按具体 Tab type 独立 | [src/storage/pinnedItems.js](../../../../src/storage/pinnedItems.js#L86-L133), [src/views/Main.vue](../../../../src/views/Main.vue#L1210-L1338) | `test-shortcut-command-system.js` storage/runtime assertions | [spec.md](spec.md), [quick-paste-runtime.md](../../../knowledge/quick-paste-runtime.md) |
| 全局触发使用最后退出 Tab 分组 | [src/global/quickPasteRuntime.js](../../../../src/global/quickPasteRuntime.js#L149-L202), [src/storage/pinnedItems.js](../../../../src/storage/pinnedItems.js#L66-L84) | runtime last-context quick-paste assertion | [quick-paste-pin-group-cache.md](../../../knowledge/quick-paste-pin-group-cache.md) |
| 只记忆最后退出 Tab | [src/views/Main.vue](../../../../src/views/Main.vue#L782-L790), [src/views/Main.vue](../../../../src/views/Main.vue#L899-L968) | existing build/runtime coverage; manual Tab switch path | [verify.md](verify.md) |
| 全局缓存按 Type 管理 | [src/global/quickPasteRuntime.js](../../../../src/global/quickPasteRuntime.js#L149-L202) | runtime cache isolation assertion | [quick-paste-pin-group-cache.md](../../../knowledge/quick-paste-pin-group-cache.md) |
| 单项置顶成员保存组合后立即触发当前 Tab bucket | [src/views/Main.vue](../../../../src/views/Main.vue#L1337), [src/storage/pinnedItems.js](../../../../src/storage/pinnedItems.js#L175) | pinned-overlap + stale-context save/trigger assertion | [verify.md](verify.md), [quick-paste-runtime.md](../../../knowledge/quick-paste-runtime.md), [error memory](../../../knowledge/error-memory/2026-07-15-pin-group-active-context-bucket-drift.md) |
| 文档同步 | docs under this task and knowledge docs | code-link audit | [PROJECT_STATUS.md](../../PROJECT_STATUS.md) |
