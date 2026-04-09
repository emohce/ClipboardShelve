# Implementation Plan: 单条目快捷操作增强

**Branch**: `003-quick-item-operation` | **Date**: 2026-04-09 | **Spec**: [`spec.md`](./spec.md)
**Input**: Feature specification from `/specs/003-quick-item-operation/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

在不破坏现有列表交互的前提下，补齐三项能力：`F2` 别名新增/更新（收藏页保留原弹层链路）、`ctrl+alt+num` 抽屉序号执行迁移、`shift+Enter` 在“单文件+别名”场景下的重命名粘贴。技术上采用最小改动路径：复用现有 hotkey feature 注册与抽屉菜单数据源，新增别名持久化与执行分支守卫，确保“展示序号=执行序号”且非目标类型回退原组合粘贴链路。

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: JavaScript (ES modules) + Vue 3.5.x SFC  
**Primary Dependencies**: Vite 6.x, Element Plus 2.x, `@tanstack/vue-virtual` 3.x, uTools API  
**Storage**: uTools `dbStorage` + 本地 JSON（既有 `window.db` 持久化链路）  
**Testing**: 手工回归（uTools 插件环境）；静态检查使用现有 lint  
**Target Platform**: macOS/Windows uTools 插件 WebView 环境  
**Project Type**: 前端桌面插件（单仓库 Vue 应用）  
**Performance Goals**: 保持现有列表交互流畅度，不新增可感知卡顿  
**Constraints**: 不破坏现有收藏页弹层链路；不改变非目标快捷键语义；最小改动  
**Scale/Scope**: 仅覆盖单条目操作链路（`ClipItemList`/`ClipItemRow`/hotkey bindings）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `.specify/memory/constitution.md` 当前为模板占位文本，暂无可执行硬性门禁条款。
- 本计划改为遵循仓库规则门禁（`AGENTS.md` 与 `vibe/ai-rules/*`）：
  - 实现前检索错误记忆索引：通过（已命中并扩展 `00-error-memory.md`）。
  - 高风险目录评估：本次未改 `public/plugin.json` / `public/preload.js` / `public/listener.js`，通过。
  - 最小改动原则：通过（热键映射与行渲染点状补丁）。
  - 文档/知识沉淀：通过（spec/tasks/quickstart + error memory）。

## Project Structure

### Documentation (this feature)

```text
specs/003-quick-item-operation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-item-operation-hotkeys.md
└── tasks.md
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── cpns/
│   ├── ClipItemList.vue
│   └── ClipItemRow.vue
├── global/
│   ├── hotkeyBindings.js
│   └── hotkeyLabels.js
├── hooks/
│   └── useClipOperate.js
├── style/cpns/
│   └── clip-item-list.less
└── utils/
    └── index.js
```

**Structure Decision**: 采用单项目前端插件结构，变更集中在 `src/` 现有列表渲染、热键映射与工具链路，不引入新子工程。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
