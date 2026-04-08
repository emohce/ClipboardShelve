# Implementation Plan: 删除、搜索与列表导航体验修复

**Branch**: `001-delete-search-nav-ux` | **Date**: 2026-04-08 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-delete-search-nav-ux/spec.md`

## Summary

在 uTools 剪贴板插件（Vue 3 + Vite + `@tanstack/vue-virtual`）中，修复四类交互缺陷：**(1)  delete 后条目异常“回滚”或恢复**，需对齐持久化与列表刷新顺序（参见错误记忆 EM-2026-04-06-json-db-debounce-persist）；**(2) 搜索模式下部分按键/输入错误退出搜索**，需梳理 `filterText`/`onEmpty`/`onPanelHide` 与全局 `keydown` 展开搜索逻辑；**(3) 搜索框聚焦且 IME 组字时 Enter 应确认候选而非触发列表 `list-enter`**，当前 `list-enter` 未像其他 feature 一样排除搜索框焦点；**(4) 虚拟列表方向键导航时顶/底行完整可见与尽量居中**，在现有 `useVirtualListScroll` / `submitNavigationAction` 链路上收紧策略（并遵守 EM-2026-04-06-scroll-path 已确认的滚动祖先与 `scrollIntoView` 通路）。

## Technical Context

**Language/Version**: JavaScript (ES modules) + Vue 3.5.x（SFC）  
**Primary Dependencies**: Vite 6.x、`@tanstack/vue-virtual` 3.x、Element Plus 2.x、Less 4.x  
**Storage**: uTools `db` / 本地 JSON（见 `src/global/initPlugin.js`、`src/global/utoolsDB.js`）  
**Testing**: 仓库未配置自动化 E2E；以 `pnpm run serve` 手工与规格 SC 核对为主  
**Target Platform**: uTools 插件环境（Chromium 内核）  
**Project Type**: Desktop 插件（单页 Vue 前端 + `public` 预加载脚本）  
**Performance Goals**: 列表虚拟滚动保持交互流畅；键盘事件处理保持轻量（现有代码已在 `ClipSearch` 的 keydown 中注明）  
**Constraints**: 须遵守 [AGENTS.md](../../AGENTS.md) 高风险区（`public/plugin.json`、`preload.js`、`listener.js`、`src/global/`）；列表滚动须基于**真实滚动容器**与已记录的 `scrollIntoView` 通路（[EM-2026-04-06-scroll-path](../../vibe/vibe-doc/ai-error-memory/2026-04-06-scroll-path.md)）  
**Scale/Scope**: 单窗口列表 + 搜索面板 + 全局热键分层（`src/global/hotkeyRegistry.js`、`hotkeyBindings.js`）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|--------|
| 项目宪法（`.specify/memory/constitution.md`） | **N/A（模板未 ratify）** | 无可执行原则条目；本特性以 [AGENTS.md](../../AGENTS.md)、规格 FR/SC 与 DoD 为门禁。 |
| 最小改动 / 单任务原子性 | Pass | 四类问题分轴修改，避免混拆事件链。 |
| 高风险目录变更预说明 | Pass | 若触达 `src/global/` 持久化或 `public` 入口，须在任务 PR 中写明回归面。 |
| 错误记忆检索 | Pass（计划阶段） | 已索引 **EM-2026-04-06-json-db-debounce-persist**（删除回滚）、**EM-2026-04-06-scroll-path**（滚动通路）；实现前须读正文。 |

**Post Phase 1 re-check**: 设计仍满足：无新增对外 API；契约仅限 UI 行为文档；持久化与热键变更保持可选、可回滚。

## Project Structure

### Documentation (this feature)

```text
specs/001-delete-search-nav-ux/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
├── spec.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── views/Main.vue           # 搜索展开 keydown、showList、clear/search 状态
├── cpns/ClipItemList.vue    # 列表导航、delete-recovery、热键 feature 注册
├── cpns/ClipSearch.vue      # filterText、onEmpty、IME/Delete 在搜索框内行为
├── hooks/useVirtualListScroll.js
├── hooks/useListNavigation.js
├── global/hotkeyRegistry.js
├── global/hotkeyBindings.js
├── global/initPlugin.js     # remove / 防抖落盘
└── global/utoolsDB.js

public/
├── plugin.json
├── preload.js
└── listener.js
```

**Structure Decision**: 单仓库 SPA 插件；本特性主要触及 `src/cpns`、`src/views`、`src/hooks`，持久化类修改仅在有证据指向 `initPlugin`/防抖写盘时进入 `src/global`。

**Layout（本轮补充）**：[`Main.vue`](../../src/views/Main.vue) 中 `.clip-break` 为固定顶栏预留竖向空间，须与 [`clip-switch.less`](../../src/style/cpns/clip-switch.less) 实际高度一致；详见 [research.md R-005](./research.md)、错误记忆 [EM-2026-04-08-clipboard-nav-scroll-search-layout](../../vibe/vibe-doc/ai-error-memory/2026-04-08-clipboard-nav-scroll-search-layout.md)。

## Complexity Tracking

> 无 Constitution 违例需逐条豁免说明；本表留空。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
