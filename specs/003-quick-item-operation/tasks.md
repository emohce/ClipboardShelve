# Tasks: 单条目快捷操作增强

**Input**: Design documents from `/specs/003-quick-item-operation/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 本特性规格未强制 TDD，任务以实现与手工回归为主。  
**Organization**: 任务按用户故事分组，保证每个故事可独立实现与独立验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: 用户故事标签（US1、US2、US3）
- 每个任务描述均包含明确文件路径

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 对齐本特性文档与任务执行上下文

- [X] T001 校对 `specs/003-quick-item-operation/spec.md`、`specs/003-quick-item-operation/plan.md` 与 `specs/003-quick-item-operation/contracts/ui-item-operation-hotkeys.md` 的术语一致性
- [X] T002 梳理受影响代码入口并记录到 `specs/003-quick-item-operation/plan.md`（`src/cpns/ClipItemList.vue`、`src/global/hotkeyBindings.js`、`src/global/hotkeyLabels.js`、`src/hooks/useClipOperate.js`、`src/utils/index.js`）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 建立所有用户故事共用的热键与执行入口基线  
**⚠️ CRITICAL**: 本阶段完成前不进入任何 US 实现

- [X] T003 在 `src/cpns/ClipItemList.vue` 统一抽屉菜单数据源与序号执行入口，补充防漂移注释（确保 `openDrawerForCurrentItem` 与 `list-drawer-sub-*` 共用同一菜单）
- [X] T004 在 `src/global/hotkeyBindings.js` 增加 `shift+Enter` 对应 feature 绑定骨架，并预留 `list-save-by-alias` 执行通路
- [X] T005 [P] 在 `src/global/hotkeyLabels.js` 新增/调整相关 feature 文案占位（含序号键迁移与别名保存触发）

**Checkpoint**: 热键映射与执行骨架可支撑 US1/US2/US3 并行实现

---

## Phase 3: User Story 1 - 单条目别名快速新增与更新 (Priority: P1) 🎯 MVP

**Goal**: 让 `F2` 在普通页与收藏页都支持别名新增/更新，并保持收藏页原弹层路径  
**Independent Test**: 普通列表与收藏页分别触发 `F2`，验证别名新增/更新成功且收藏页弹层仍可用

### Implementation for User Story 1

- [X] T006 [US1] 在 `src/cpns/ClipItemList.vue` 调整 `list-tag-edit` feature 逻辑，支持“单条目别名新增/更新”并保留收藏页弹层分支
- [X] T007 [P] [US1] 在 `src/hooks/useClipOperate.js`（或当前别名处理落点文件）补充别名新增与更新的统一判定函数
- [X] T008 [US1] 在 `src/cpns/ClipItemList.vue` 增加无选中条目时 `F2` 的兜底提示与无副作用返回
- [X] T009 [US1] 在 `src/global/hotkeyLabels.js` 将 `list-tag-edit` 展示文案更新为“别名新增/更新”语义

**Checkpoint**: US1 可独立演示并通过 `spec.md` 中 US1 验收场景

---

## Phase 4: User Story 2 - 操作列表与自动执行快捷键对齐 (Priority: P2)

**Goal**: 让 `c-right` 抽屉序号与自动执行一致，并完成 `ctrl+shift+num` 到 `ctrl+alt+num` 迁移  
**Independent Test**: 展开抽屉后按 `ctrl+alt+1...9` 执行结果与同序号菜单一致，旧键位不再触发默认序号执行

### Implementation for User Story 2

- [X] T010 [US2] 在 `src/global/hotkeyBindings.js` 将 `list-drawer-sub-1..9` 默认绑定从 `ctrl+shift+num` 改为 `ctrl+alt+num`
- [X] T011 [US2] 在 `src/cpns/ClipItemList.vue` 校准 `list-drawer-sub-*` 默认索引与当前抽屉渲染序号的一致性处理
- [X] T012 [P] [US2] 在 `src/global/hotkeyLabels.js` 更新序号执行快捷键迁移后的可见文案
- [X] T013 [US2] 在 `src/cpns/ClipItemList.vue` 增加序号越界保护（超出菜单项时不执行并提示）

**Checkpoint**: US2 可独立演示并通过 `spec.md` 中 US2 验收场景

---

## Phase 5: User Story 3 - 有别名时的保存快捷触发 (Priority: P3)

**Goal**: 新增 `shift+Enter`，单文件且有别名触发重命名粘贴，其他类型保持原组合粘贴  
**Independent Test**: “单文件+别名”“组合粘贴”“纯文本”三种样本分别触发并符合预期分支

### Implementation for User Story 3

- [X] T014 [US3] 在 `src/global/hotkeyBindings.js` 为 `shift+Enter` 绑定 `list-save-by-alias`（或最终确定的 feature id）
- [X] T015 [US3] 在 `src/cpns/ClipItemList.vue` 注册并实现 `list-save-by-alias` feature，按条目类型与别名状态分流
- [X] T016 [P] [US3] 在 `src/utils/index.js`（或现有文件粘贴链路文件）封装“单文件且有别名 -> 重命名并粘贴”的调用入口
- [X] T017 [US3] 在 `src/cpns/ClipItemList.vue` 复用现有组合粘贴路径处理“组合/纯文本”回退分支，确保行为不变
- [X] T018 [US3] 在 `src/cpns/ClipItemList.vue` 增加无别名或无选中项时 `shift+Enter` 的非破坏性提示

**Checkpoint**: US3 可独立演示并通过 `spec.md` 中 US3 验收场景

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事一致性、文档与回归收口

- [ ] T019 [P] 对照 `specs/003-quick-item-operation/quickstart.md` 执行手工回归并记录结果到 `specs/003-quick-item-operation/quickstart.md`
- [X] T020 更新用户说明与变更记录（`docs/用户简明说明.md`、`changelog.md`）补充新快捷键与迁移说明
- [X] T021 复核知识沉淀需求并按需更新 `vibe/vibe-doc/ai-error-memory/`、`vibe/vibe-doc/adr/`、`vibe/vibe-doc/glossary.md`
- [X] T022 [P] 同步 `specs/003-quick-item-operation/spec.md` 与 `specs/003-quick-item-operation/quickstart.md`，补充别名弹窗 Enter/Esc 与条目别名展示验收描述
- [X] T023 [P] 在 `vibe/ai-rules/00-error-memory.md` 与 `vibe/vibe-doc/ai-error-memory/` 记录 `window.prompt` 在插件环境下的错误路径与正确通路

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 → Phase 2 → Phase 3/4/5 → Phase 6
- User Story 阶段都依赖 Phase 2 完成
- Phase 6 依赖至少一个目标用户故事完成（完整交付建议 US1+US2+US3 全部完成）

### User Story Dependencies

- **US1 (P1)**: 仅依赖 Foundational，可先做 MVP
- **US2 (P2)**: 依赖 Foundational，与 US1 实现文件有交叉，建议在 US1 后执行
- **US3 (P3)**: 依赖 Foundational，建议在 US1/US2 稳定后接入，避免快捷键冲突定位困难

### Within Each User Story

- 先改热键入口/判定，再改执行逻辑，再补边界提示与文案
- 同一文件内任务按顺序执行，不并行

### Parallel Opportunities

- T005 可与 T003/T004 并行
- US1 中 T007 可与 T006 并行准备（最终合并前需对齐）
- US2 中 T012 可与 T010/T011 并行
- US3 中 T016 可与 T015 并行
- Phase 6 中 T019 可与 T021 并行

---

## Parallel Example: User Story 2

```bash
Task: "T010 [US2] 修改 src/global/hotkeyBindings.js 完成 ctrl+alt+num 迁移"
Task: "T012 [US2] 修改 src/global/hotkeyLabels.js 更新迁移文案"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1 + Phase 2
2. 完成 US1（T006-T009）
3. 按 `spec.md` US1 独立验收，确认收藏页与普通页都可完成别名新增/更新

### Incremental Delivery

1. MVP：US1
2. 第二增量：US2（抽屉序号与快捷键迁移）
3. 第三增量：US3（`shift+Enter` 分支）
4. 收口：Phase 6 文档与知识沉淀

### Parallel Team Strategy

1. A 同学：`src/cpns/ClipItemList.vue` 主流程任务（T003/T006/T011/T015/T017）
2. B 同学：`src/global/hotkeyBindings.js` + `src/global/hotkeyLabels.js`（T004/T005/T010/T012/T014）
3. C 同学：`src/hooks/useClipOperate.js` + `src/utils/index.js`（T007/T016）与回归记录（T019）

---

## Notes

- 所有任务均符合 checklist 格式：`- [ ] Txxx [P?] [US?] 描述 + 文件路径`
- 用户故事阶段任务全部带 `[US1]/[US2]/[US3]` 标签
- Setup/Foundational/Polish 阶段不带用户故事标签
