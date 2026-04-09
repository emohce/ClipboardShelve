# Tasks: 单条目快捷操作增强

**Input**: Design documents from `/specs/003-quick-item-operation/`  
**Prerequisites**: `plan.md`（required）, `spec.md`（required）, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: 本特性未要求 TDD，任务以实现 + 手工回归为主。  
**Organization**: 任务按用户故事分组，确保每个故事可独立实现、独立验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件且不依赖未完成任务）
- **[Story]**: 用户故事标签（`[US1]`、`[US2]`、`[US3]`）
- 每条任务都包含明确文件路径

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 对齐规格与设计文档，建立任务执行基线

- [X] T001 对齐 `specs/003-quick-item-operation/spec.md`、`specs/003-quick-item-operation/plan.md`、`specs/003-quick-item-operation/contracts/ui-item-operation-hotkeys.md` 的术语与快捷键命名
- [X] T002 梳理受影响代码入口并在 `specs/003-quick-item-operation/plan.md` 校验结构清单（`src/cpns/ClipItemList.vue`、`src/cpns/ClipItemRow.vue`、`src/global/hotkeyBindings.js`、`src/global/hotkeyLabels.js`、`src/style/cpns/clip-item-list.less`、`src/utils/index.js`）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 先完成所有用户故事共享的热键和数据源基础  
**⚠️ CRITICAL**: 本阶段完成前不进入任何用户故事实现

- [X] T003 在 `src/cpns/ClipItemList.vue` 固化“抽屉展示菜单与序号执行共用同一数据源”的入口约束（`getDrawerFullMenuItems`）
- [X] T004 [P] 在 `src/global/hotkeyBindings.js` 校准主层快捷键骨架（`ctrl+alt+num` 与 `shift+Enter` 对应 feature）
- [X] T005 [P] 在 `src/global/hotkeyLabels.js` 同步 feature 可见文案（别名编辑语义、序号键迁移语义、别名保存语义）

**Checkpoint**: 共享热键映射与菜单数据源稳定，可进入各用户故事并行实现

---

## Phase 3: User Story 1 - 单条目别名快速新增与更新 (Priority: P1) 🎯 MVP

**Goal**: 在普通页/收藏页统一支持 `F2` 别名新增与更新，且收藏页保留原弹层路径  
**Independent Test**: 在普通页与收藏页分别触发 `F2`，可新增/更新别名；弹窗 `Enter` 保存、`Esc` 取消

### Implementation for User Story 1

- [X] T006 [US1] 在 `src/cpns/ClipItemList.vue` 调整 `list-tag-edit` 分支：收藏页保留 `openTagEdit`，非收藏走别名编辑
- [X] T007 [US1] 在 `src/cpns/ClipItemList.vue` 为别名编辑入口统一使用受控弹窗交互（`ElMessageBox.prompt`）
- [X] T008 [US1] 在 `src/cpns/ClipItemList.vue` 增加弹窗输入态热键隔离（阻断 `list-enter` / `list-ctrl-enter` / `list-save-by-alias` 误触发）
- [X] T009 [P] [US1] 在 `src/cpns/ClipItemList.vue` 增加“无选中条目”兜底提示与无副作用返回

**Checkpoint**: US1 可独立运行并通过 `spec.md` 的 US1 验收项

---

## Phase 4: User Story 2 - 操作列表与自动执行快捷键对齐 (Priority: P2)

**Goal**: 让 `ctrl+ArrowRight` 抽屉序号与 `ctrl+alt+num` 自动执行保持一致，并迁移旧键位  
**Independent Test**: 展开抽屉后按 `ctrl+alt+1...9` 与显示序号一致；`ctrl+shift+1...9` 不再触发默认序号执行

### Implementation for User Story 2

- [X] T010 [US2] 在 `src/global/hotkeyBindings.js` 将 `list-drawer-sub-1..9` 从 `ctrl+shift+num` 迁移为 `ctrl+alt+num`
- [X] T011 [US2] 在 `src/cpns/ClipItemList.vue` 校准 `list-drawer-sub-*` 与抽屉序号索引的一致性执行
- [X] T012 [P] [US2] 在 `src/global/hotkeyLabels.js` 更新迁移后的快捷键说明文案
- [X] T013 [US2] 在 `src/cpns/ClipItemList.vue` 增加序号越界防护与提示（超出菜单项时不执行）

**Checkpoint**: US2 可独立运行并通过 `spec.md` 的 US2 验收项

---

## Phase 5: User Story 3 - 有别名时的保存快捷触发 (Priority: P3)

**Goal**: `shift+Enter` 在“单文件+有别名”走重命名粘贴，其他类型保持原组合粘贴  
**Independent Test**: “单文件+别名”“组合粘贴”“纯文本”三组样本触发后分支正确且互不影响

### Implementation for User Story 3

- [X] T014 [US3] 在 `src/global/hotkeyBindings.js` 为 `list-save-by-alias` 绑定 `shift+Enter`
- [X] T015 [US3] 在 `src/cpns/ClipItemList.vue` 实现 `list-save-by-alias` 分流（单文件+别名重命名；其他回退默认粘贴）
- [X] T016 [P] [US3] 在 `src/utils/index.js` 封装“单文件按别名重命名并粘贴”工具函数并导出
- [X] T017 [US3] 在 `src/cpns/ClipItemRow.vue` 增加“别名优先 + 原始信息省略”渲染（文本/文件/图片差异化）
- [X] T018 [US3] 在 `src/style/cpns/clip-item-list.less` 增加最小样式补丁，保障图片左侧别名展示不影响预览与紧凑布局
- [X] T019 [P] [US3] 在 `src/cpns/ClipItemList.vue` 为无选中/无别名/失败回退补充非破坏性提示

**Checkpoint**: US3 可独立运行并通过 `spec.md` 的 US3 验收项与 quickstart 场景 C/D

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 文档同步、知识沉淀、回归收口

- [X] T020 [P] 同步 `specs/003-quick-item-operation/spec.md` 与 `specs/003-quick-item-operation/quickstart.md` 的 Enter/Esc 与别名展示验收描述
- [X] T021 [P] 在 `vibe/vibe-doc/ai-error-memory/` 新增本次错误记录并在 `vibe/ai-rules/00-error-memory.md` 更新索引
- [ ] T022 [P] 对照 `specs/003-quick-item-operation/quickstart.md` 执行手工回归并回填结果到 `specs/003-quick-item-operation/quickstart.md`
- [X] T023 更新 `docs/用户简明说明.md` 与 `changelog.md` 的快捷键迁移和别名交互说明

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 -> Phase 2 -> Phase 3/4/5 -> Phase 6
- User Story 阶段都依赖 Foundational（Phase 2）完成
- Phase 6 依赖至少一个用户故事完成；完整交付建议 US1+US2+US3 全部完成

### User Story Dependencies

- **US1 (P1)**: 仅依赖 Foundational，可先作为 MVP
- **US2 (P2)**: 依赖 Foundational，建议在 US1 后执行以降低热键回归风险
- **US3 (P3)**: 依赖 Foundational，建议在 US1/US2 稳定后接入

### Within Each User Story

- 先改入口/判定，再改执行链路，最后补兜底提示与文档同步
- 同文件内串行，不做并行冲突改动

### Parallel Opportunities

- T004 与 T005 可并行
- T009 可与 T006-T008 并行准备
- T012 可与 T010/T011 并行
- T016 可与 T015 并行
- T020/T021/T022 可并行推进

---

## Parallel Example: User Story 3

```bash
Task: "T015 [US3] 在 src/cpns/ClipItemList.vue 实现 list-save-by-alias 分流"
Task: "T016 [US3] 在 src/utils/index.js 封装单文件别名重命名粘贴工具"
Task: "T018 [US3] 在 src/style/cpns/clip-item-list.less 增加图片左侧别名样式补丁"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1 + Phase 2
2. 完成 US1（T006-T009）
3. 按 `spec.md` US1 独立验收（普通页+收藏页、Enter/Esc）

### Incremental Delivery

1. MVP：US1（F2 别名统一）
2. 增量二：US2（抽屉序号与快捷键迁移）
3. 增量三：US3（`shift+Enter` + 条目别名展示）
4. 收口：Phase 6（文档、记忆、回归）

### Parallel Team Strategy

1. A：`src/cpns/ClipItemList.vue` 主流程（T003/T006/T008/T011/T015/T019）
2. B：`src/global/hotkeyBindings.js` + `src/global/hotkeyLabels.js`（T004/T005/T010/T012/T014）
3. C：`src/cpns/ClipItemRow.vue` + `src/style/cpns/clip-item-list.less` + `src/utils/index.js`（T016/T017/T018）与文档收口（T020-T023）

---

## Notes

- 全部任务均符合 checklist 格式：`- [ ] Txxx [P?] [US?] 描述 + 文件路径`
- 仅用户故事阶段任务带 `[USx]` 标签
- Setup/Foundational/Polish 阶段不加用户故事标签
