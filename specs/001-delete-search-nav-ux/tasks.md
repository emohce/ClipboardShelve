---
description: "Task list for 001-delete-search-nav-ux (delete, search, IME, list scroll)"
---

# Tasks: 删除、搜索与列表导航体验修复

**Input**: Design documents from `/specs/001-delete-search-nav-ux/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: 规格未要求 TDD；验证以 [quickstart.md](./quickstart.md) 与 spec SC 的手工/回归为准。

**Organization**: 按 spec 用户故事优先级（P1→P2→P2→P3）分阶段，便于独立交付与验收。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可在阶段内并行（不同文件、无未完成依赖）
- **[Story]**: 仅用户故事阶段任务使用 `[US1]`…`[US4]`
- 描述中须含可定位的仓库相对路径

---

## Phase 1: Setup（共享准备）

**Purpose**: 实现前对齐已知错误记忆与基线复现，不改动产品代码。

- [x] T001 按 [vibe/ai-rules/00-error-memory.md](../../vibe/ai-rules/00-error-memory.md) 通读索引命中项正文：[vibe/vibe-doc/ai-error-memory/2026-04-06-json-db-debounce-persist.md](../../vibe/vibe-doc/ai-error-memory/2026-04-06-json-db-debounce-persist.md)（删除/持久化）、[vibe/vibe-doc/ai-error-memory/2026-04-06-scroll-path.md](../../vibe/vibe-doc/ai-error-memory/2026-04-06-scroll-path.md)（滚动通路）
- [x] T002 按 [specs/001-delete-search-nav-ux/quickstart.md](./quickstart.md) 第 1–4 节执行基线复现（或确认无法复现），将字符/场景登记表记回 [specs/001-delete-search-nav-ux/quickstart.md](./quickstart.md) 或附录备注

---

## Phase 2: Foundational（阻塞性通路确认）

**Purpose**: 确认真实数据流与事件链后再改逻辑；完成前不建议进入用户故事实现。

**⚠️ CRITICAL**: 用户故事实现前应完成本阶段

- [x] T003 [P] 梳理删除到落盘全链路：`window.remove` / `removeItemViaId`、`debouncedWriteLocal` / `updateDataBaseLocal` 调用条件与顺序，记录结论到实现 PR 描述或团队可见笔记（主文件 [src/global/initPlugin.js](../../src/global/initPlugin.js)、必要时 [src/global/utoolsDB.js](../../src/global/utoolsDB.js)）
- [x] T004 [P] 梳理 `deleteAnchor`、`submitNavigationAction("delete-recovery")`、`showList` 监听交互，对照 [specs/001-delete-search-nav-ux/research.md](./research.md) R-001（主文件 [src/cpns/ClipItemList.vue](../../src/cpns/ClipItemList.vue)）
- [x] T005 [P] 梳理搜索退出触发：`filterText`→`onEmpty`、`handleFocusOut`→`onPanelHide`（主文件 [src/cpns/ClipSearch.vue](../../src/cpns/ClipSearch.vue)）
- [x] T006 [P] 梳理捕获阶段展开搜索与 `isPlainTextInput` 判定（主文件 [src/views/Main.vue](../../src/views/Main.vue)）

**Checkpoint**: 已确认删除、搜索、热键三条通路的“真实数据源 / 真实滚动祖先”（若涉及列表），可开始 US1

---

## Phase 3: User Story 1 — 删除结果稳定可靠 (Priority: P1) 🎯 MVP

**Goal**: 满足 FR-001 / SC-001：删除后无用户撤销则不恢复。

**Independent Test**: 仅删除与重进插件验证列表与持久化，不依赖搜索与方向键。

### Implementation for User Story 1

- [x] T007 [US1] 按 T003 结论在 [src/global/initPlugin.js](../../src/global/initPlugin.js)（必要时 [src/global/utoolsDB.js](../../src/global/utoolsDB.js)）修复删除后未持久化或错误回滚根因，使连续删除及重进后数据与列表一致
- [x] T008 [US1] 若根因在列表恢复逻辑：在 [src/cpns/ClipItemList.vue](../../src/cpns/ClipItemList.vue) 修正 `delete-recovery` / `deleteAnchor` 与 `showList` 刷新时序，避免误把已删项拉回可见列表

**Checkpoint**: SC-001 手工用例可通过

---

## Phase 4: User Story 2 — 搜索不因正常输入意外结束 (Priority: P2)

**Goal**: 满足 FR-002 / SC-002。

**Independent Test**: 仅展开搜索框输入问题字符集，不依赖列表 Enter 或方向键。

### Implementation for User Story 2

- [x] T009 [P] [US2] 在 [src/cpns/ClipSearch.vue](../../src/cpns/ClipSearch.vue) 修正误触发 `onEmpty` / `onPanelHide` 的路径（含 watch 与失焦策略），保留用户明确清空退出语义
- [x] T010 [P] [US2] 在 [src/views/Main.vue](../../src/views/Main.vue) 收紧 `keyDownCallBack` 对“可打印字符/展开搜索”的判定与焦点移交，避免特定键清空 `filterText` 或折叠搜索

**Checkpoint**: SC-002 登记字符集 0 次误退出

---

## Phase 5: User Story 3 — 中文 IME 下 Enter 优先入搜索栏 (Priority: P2)

**Goal**: 满足 FR-003 / SC-003；对齐 [contracts/ui-keyboard-search.md](./contracts/ui-keyboard-search.md) C-001。

**Independent Test**: 搜索框聚焦 + IME 组字 + Enter，不依赖删除修复。

### Implementation for User Story 3

- [x] T011 [US3] 在 [src/cpns/ClipItemList.vue](../../src/cpns/ClipItemList.vue) 的 `registerFeature("list-enter"` / `list-ctrl-enter` 处理中增加与 `list-view-full` 一致的搜索框焦点与 `e.isComposing`（及必要的 `key === "Process"`）短路，避免组字期间主确认列表项
- [x] T012 [P] [US3] 若短路在注册层更稳妥：在 [src/global/hotkeyRegistry.js](../../src/global/hotkeyRegistry.js)（或集中分发点）对 composition 中的 Enter 不予分发给 `list-enter`，且不破坏设置页等其它层行为

**Checkpoint**: SC-003 通过且无回归非 IME Enter 既定行为

---

## Phase 6: User Story 4 — 方向键导航选中项完整可见 (Priority: P3)

**Goal**: 满足 FR-004—FR-006 / SC-004；遵守滚动真实通路（EM-2026-04-06-scroll-path）。

**Independent Test**: 仅长列表方向键，不依赖删除与搜索修复。

### Implementation for User Story 4

- [x] T013 [US4] 在 [src/hooks/useVirtualListScroll.js](../../src/hooks/useVirtualListScroll.js) 调整 `resolveScrollInstruction` / `scrollToIndex`：顶/底项强制完整可见，中部在条件允许时倾向垂直居中
- [x] T014 [US4] 在 [src/cpns/ClipItemList.vue](../../src/cpns/ClipItemList.vue) 校准 `normalizeNavigationScrollOptions`、`submitNavigationAction("step-nav" / "page-nav")` 传入的 `scrollMode` / `edge` / `forceScroll` / `centerStartIndex`，使上键到顶等场景触发 T013 策略

**Checkpoint**: SC-004 抽样下 0 次不可见高亮

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 整体验收与知识沉淀

- [x] T015 全量跑 [specs/001-delete-search-nav-ux/quickstart.md](./quickstart.md) 第 5 节回归嗅探（多选/收藏/标签等）
- [x] T016 若确认新失败模式或证伪路径：更新 [vibe/vibe-doc/ai-error-memory/](../../vibe/vibe-doc/ai-error-memory/) 与 [vibe/ai-rules/00-error-memory.md](../../vibe/ai-rules/00-error-memory.md) 索引；否则在 PR 说明中写“无需新错误记录”

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** → **Phase 2** → **Phase 3–6**（用户故事按 P1→P2→P2→P3 建议顺序；有经验证隔离时可并行不同故事，见下）→ **Phase 7**

### User Story Dependencies

| Story | 依赖 | 可并行 |
|-------|------|--------|
| US1 (P1) | Phase 2 完成 | MVP 前建议独占 `initPlugin.js` / `ClipItemList.vue` 删除相关改动 |
| US2 (P2) | Phase 2 完成 | T009 与 T010 可并行（不同文件） |
| US3 (P2) | Phase 2 完成 | T012 与 T011 择一为主任务，避免重复拦截；另一任务可删或标为验证 |
| US4 (P3) | Phase 2 完成 | T013 优先于或与 T014 短迭代联调（同故事内建议先 hook 再调用方） |

### Within Each User Story

- US1：先 T003 结论再 T007→T008（若仅需一端修复可跳过另一端并备注）
- US4：先 T013 再 T014 联调，或单次提交内同时验证

### Parallel Opportunities

- **Phase 2**: T003、T004、T005、T006 全可 `[P]` 并行（不同文件/关注点）
- **US2**: T009 ∥ T010
- **US3**: T011 与 T012 二选一或明确分层后有限并行，避免双重 `preventDefault` 冲突

---

## Parallel Example: Phase 2

```text
T003 删除落盘链路 → src/global/initPlugin.js
T004 delete-recovery → src/cpns/ClipItemList.vue
T005 搜索 onEmpty → src/cpns/ClipSearch.vue
T006 展开搜索 keydown → src/views/Main.vue
```

## Parallel Example: User Story 2

```text
T009 → src/cpns/ClipSearch.vue
T010 → src/views/Main.vue
```

---

## Implementation Strategy

### MVP First（仅 User Story 1）

1. Phase 1 + Phase 2  
2. Phase 3（US1）  
3. 按 [quickstart.md](./quickstart.md) 与 SC-001 停点验收  

### Incremental Delivery

1. US1 → 验收 → US2（搜索）→ 验收 → US3（IME）→ 验收 → US4（滚动）→ Phase 7  

### 多开发者

- Phase 2 完成后：一人 US1；另一人可做 US2（不同文件），但合并前需跑全 quickstart 防交叉回归。

---

## Notes

- 修改 [public/plugin.json](../../public/plugin.json)、[public/preload.js](../../public/preload.js)、[public/listener.js](../../public/listener.js) 前须按 AGENTS.md 评估影响；本任务列表默认以 `src/` 为主。
- 任务格式校验：每条均为 `- [ ] Tnnn ...` 且含路径；用户故事任务均含 `[USn]`。

---

## Task Summary

| 指标 | 值 |
|------|-----|
| 任务总数 | 16（T001–T016） |
| US1 | 2（T007–T008） |
| US2 | 2（T009–T010） |
| US3 | 2（T011–T012） |
| US4 | 2（T013–T014） |
| Setup + Foundational + Polish | 8 |
| 建议 MVP 范围 | Phase 1–3（至 T008） |
