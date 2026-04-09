# Graph Report - .  (2026-04-09)

## Corpus Check
- 194 files · ~83,587 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 363 nodes · 385 edges · 110 communities detected
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 95 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `UToolsDB` - 27 edges
2. `EzClipboard Agent Guide` - 18 edges
3. `Error Memory Rules` - 11 edges
4. `Implementation Plan: 删除、搜索与列表导航体验修复` - 10 edges
5. `Tasks: 删除、搜索与列表导航体验修复` - 9 edges
6. `BatchOperationQueue` - 8 edges
7. `Changelog` - 8 edges
8. `Error Memory: EM-2026-04-06-scroll-path` - 8 edges
9. `Error Memory Rules` - 8 edges
10. `DesktopPreviewManager` - 7 edges

## Surprising Connections (you probably didn't know these)
- `UI Contract: Keyboard, Search, and List Selection` --conceptually_related_to--> `Preview Feature Spec`  [INFERRED]
  specs/001-delete-search-nav-ux/contracts/ui-keyboard-search.md → vibe/specs/0001-preview/01-spec.md
- `发布说明（用户视角）` --references--> `Changelog`  [EXTRACTED]
  publishLog.md → changelog.md
- `EzClipboard Agent Guide` --references--> `src/global Boundary`  [EXTRACTED]
  AGENTS.md → src/global/README.md
- `EzClipboard Agent Guide` --references--> `AI Writing Style`  [EXTRACTED]
  AGENTS.md → vibe/ai-rules/00-writing-style.md
- `EzClipboard Agent Guide` --references--> `Architecture Planning Rules`  [EXTRACTED]
  AGENTS.md → vibe/ai-rules/02-architecture-planning.md

## Hyperedges (group relationships)
- **Error Governance Cycle** — error_memory_rules, spec_extraction_rules, architecture_planning_rules, implementation_constraints, verification_checklist [INFERRED 0.90]
- **Spec Workflow Cycle** — spec_extraction_rules, architecture_planning_rules, task_decomposition_rules, implementation_constraints, verification_checklist, change_log_format, ai_todo_prompt [INFERRED 0.90]
- **Feature Doc Cycle** — spec_quality_checklist, ui_contract_keyboard_search, preview_spec_doc, preview_plan_doc, preview_tasks_doc, preview_verify_doc [INFERRED 0.90]

## Communities

### Community 0 - "EzClipboard Agent Changelog"
Cohesion: 0.1
Nodes (37): EzClipboard Agent Guide, Changelog, EzClipboard 插件核心要素说明（列表）, 超级剪贴板 · 简明说明（用户）, 发布说明（用户视角）, 剪贴板（uTools 插件 `eClipboard`）, Specification Quality Checklist: 删除、搜索与列表导航体验修复, UI Contract: Keyboard, Search, and List Selection (+29 more)

### Community 1 - "utoolsDB js DB"
Cohesion: 0.15
Nodes (2): DB_ID_DATA(), UToolsDB

### Community 2 - "devDbStub js ensureDevDbStub"
Cohesion: 0.09
Nodes (10): getLazyLoadManager(), LazyLoadManager, getResizeObserverErrorMessage(), isResizeObserverError(), getOptimalWindowSize(), getUToolsMainWindowSize(), initWindowManager(), loadWindowConfig() (+2 more)

### Community 3 - "hotkeyLayers js activateLayer"
Cohesion: 0.1
Nodes (7): dispatch(), findBinding(), getEffectiveLayer(), getLayerPriorityOrder(), isEditableTarget(), isMac(), shortcutIdForLookup()

### Community 4 - "Universal Intake Architecture"
Cohesion: 0.2
Nodes (17): Universal Feature Intake Prompt, Architecture Planning Rules, Change Log Format, src/cpns Boundary, Clipboard Nav Scroll Search Layout, hideMainWindow/showMainWindow API race, JSON DB Debounce Persist, Scroll Path Failure (+9 more)

### Community 5 - "hotkeyBindings js bindingKey"
Cohesion: 0.19
Nodes (7): eventToShortcutId(), formatShortcutDisplay(), formatShortcutTextForPlatform(), isMacPlatform(), keyFromCode(), normalizeShortcutId(), parseShortcutId()

### Community 6 - "index js copy"
Cohesion: 0.24
Nodes (7): copy(), copyAndPasteAndExit(), copyOnly(), copyWithSearchFocus(), getImageDataUrlForCopy(), isValidImageData(), paste()

### Community 7 - "desktopPreview js calculateOptimalPr"
Cohesion: 0.27
Nodes (5): calculateOptimalPreviewSize(), createDesktopPreviewWindow(), DesktopPreviewManager, escapeHtml(), getDesktopScreenInfo()

### Community 8 - "batchOperations js batchCollect"
Cohesion: 0.22
Nodes (1): BatchOperationQueue

### Community 9 - "Preview Preview Preview"
Cohesion: 0.33
Nodes (10): Preview Feature Plan, Preview Feature Spec, Preview Feature Tasks, Preview Feature Verify, Specs Directory Rules, Plan Template, Specs Template README, Spec Template (+2 more)

### Community 10 - "readSetting js getHoverPreviewConfig"
Cohesion: 0.28
Nodes (4): saveSetting(), syncSetting(), normalizeDefaultSetting(), restoreSetting()

### Community 11 - "test syntax isAtBottomBoundary"
Cohesion: 0.29
Nodes (0): 

### Community 12 - "dbMigration js backupJsonDb"
Cohesion: 0.48
Nodes (5): backupJsonDb(), executeMigration(), migrateToUToolsDB(), readJsonDb(), validateData()

### Community 13 - "hotkeyGraph js buildHotkeyTree"
Cohesion: 0.6
Nodes (3): buildHotkeyTree(), getFeatureFamilyGroupKey(), getNumericShortcutGroupKey()

### Community 14 - "name name"
Cohesion: 0.4
Nodes (5): Feature: <feature-name>, Plan: <feature-name>, Tasks, Verify, Specs Template

### Community 15 - "Multi AI Multi"
Cohesion: 0.5
Nodes (5): Multi AI Execution Strategy, Multi AI Merge Checklist, Multi AI Merge Prompt, Multi AI Orchestrator, AI Tools Use

### Community 16 - "剪贴板预览效果优化 图片 剪贴板预览效果优化"
Cohesion: 0.67
Nodes (4): Feature: 剪贴板预览效果优化（图片 / 文字 / Shift 锁定）, Plan: 剪贴板预览效果优化（图片 / 文字 / Shift 锁定）, Tasks, Verify

### Community 17 - "预览效果优化 图片 预览效果优化"
Cohesion: 0.67
Nodes (4): Feature: 预览效果优化（图片 / 文字 / Shift 锁定）, Plan: 预览效果优化（图片 / 文字 / Shift 锁定）, Tasks, Verify

### Community 18 - "移动效果优化 列表移动与删除修复 列表移动效果与删除状态修复"
Cohesion: 0.5
Nodes (4): 移动效果优化, Feature: 列表移动与删除修复, Feature: 列表移动效果与删除状态修复, Feature: 列表移动与删除修复

### Community 19 - "Vite TanStack Vite"
Cohesion: 0.83
Nodes (4): Feature: Vite + TanStack Virtual 列表重构（S2）, Plan: Vite + TanStack Virtual 列表重构（S2）, 最新框架方案适配评估, EzClipboard 项目全量需求、存储、交互与迁移总览

### Community 20 - "04 Vite TanStack"
Cohesion: 0.67
Nodes (4): 04-verify, Plan: Vite + TanStack Virtual 列表重构, 03-tasks, Verify

### Community 21 - "移动效果优化 移动效果优化 移动效果优化"
Cohesion: 0.67
Nodes (3): Feature: 移动效果优化, Plan: 移动效果优化, Tasks: 移动效果优化

### Community 22 - "Vite TanStack Vite"
Cohesion: 0.67
Nodes (3): Feature: Vite + TanStack Virtual 列表重构, Feature: Vite + TanStack Virtual 列表重构, Plan: Vite + TanStack Virtual 列表重构

### Community 23 - "JSON 存储回归与白屏修复 JSON"
Cohesion: 0.67
Nodes (3): Feature: JSON 存储回归与白屏修复, Plan: JSON 存储回归与白屏修复, Verify

### Community 24 - "vite config copyUToolsPublicAssets"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "useListNavigation js useListNavigati"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "useVirtualListScroll js useVirtualLi"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "TODO 优化 1"
Cohesion: 1.0
Nodes (2): TODO 优化, 1. 现状要点（代码依据）

### Community 28 - "底层数据重构原始需求梳理 底层数据重构原始需求梳理"
Cohesion: 1.0
Nodes (2): 底层数据重构原始需求梳理, 底层数据重构原始需求梳理

### Community 29 - "Phase 2 Phase"
Cohesion: 1.0
Nodes (2): Phase 2 实施记录：数据库迁移到 uTools DB API, Phase 2 实施计划：数据库迁移到 uTools DB API

### Community 30 - "数据展示需求 计划更新 数据展示需求核验修复"
Cohesion: 1.0
Nodes (2): 数据展示需求 — 计划更新（代码核验基准）, 数据展示需求核验修复 — 评估优化方案

### Community 31 - "剪贴板预览效果优化 图片 剪贴板预览效果优化"
Cohesion: 1.0
Nodes (2): Feature: 剪贴板预览效果优化（图片 / 文字 / Shift 交互）, Plan: 剪贴板预览效果优化（图片 / 文字 / Shift 锁定）

### Community 32 - "Preview效果优化 Preview效果优化"
Cohesion: 1.0
Nodes (2): Feature: Preview效果优化, Plan: Preview效果优化

### Community 33 - "列表移动效果优化 列表移动效果优化"
Cohesion: 1.0
Nodes (2): Feature: 列表移动效果优化, Plan: 列表移动效果优化

### Community 34 - "剪贴板列表键盘移动与选中展示优化 列表键盘移动 分页一致与选中"
Cohesion: 1.0
Nodes (2): Feature: 剪贴板列表键盘移动与选中展示优化, Plan: 列表键盘移动、分页一致与选中/锁标展示

### Community 35 - "列表移动效果优化 列表移动效果优化"
Cohesion: 1.0
Nodes (2): Feature: 列表移动效果优化, Plan: 列表移动效果优化

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (2): Tasks, Verify

### Community 37 - "任务清单 验证清单"
Cohesion: 1.0
Nodes (2): 任务清单, 验证清单

### Community 38 - "260201 clipboard"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "babel config"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "vue config"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "test compile"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "问题排查 点击"
Cohesion: 1.0
Nodes (1): 问题排查：点击/Enter 无法自动粘贴到外部编辑框 & uTools 窗口自动弹出

### Community 43 - "EzClipboard 存储层统一改造计划"
Cohesion: 1.0
Nodes (1): EzClipboard 存储层统一改造计划（审阅版）

### Community 44 - "EzClipboard"
Cohesion: 1.0
Nodes (1): EzClipboard

### Community 45 - "tempToFix 方案修订"
Cohesion: 1.0
Nodes (1): tempToFix 方案修订（基于用户 3 点澄清）

### Community 46 - "待优化"
Cohesion: 1.0
Nodes (1): 待优化

### Community 47 - "Temp To"
Cohesion: 1.0
Nodes (1): Temp To fix

### Community 48 - "EzClipboard 项目全量需求"
Cohesion: 1.0
Nodes (1): EzClipboard 项目全量需求、存储、交互与迁移总览

### Community 49 - "搜索框 键入展开"
Cohesion: 1.0
Nodes (1): 搜索框「键入展开」中文输入法首键问题 — 汇总

### Community 50 - "列表交互优化方案评估"
Cohesion: 1.0
Nodes (1): 列表交互优化方案评估

### Community 51 - "preview 原始需求"
Cohesion: 1.0
Nodes (1): preview 原始需求

### Community 52 - "普通图片预览无效 核验说明"
Cohesion: 1.0
Nodes (1): 普通图片预览无效 — 核验说明

### Community 53 - "Baseline"
Cohesion: 1.0
Nodes (1): Baseline

### Community 54 - "当前改动核心逻辑汇总"
Cohesion: 1.0
Nodes (1): 当前改动核心逻辑汇总

### Community 55 - "快捷键与功能多系统核验"
Cohesion: 1.0
Nodes (1): 快捷键与功能多系统核验

### Community 56 - "快捷键树形展示功能实现文档"
Cohesion: 1.0
Nodes (1): 快捷键树形展示功能实现文档

### Community 57 - "剪贴板监听程序原理与监听方式"
Cohesion: 1.0
Nodes (1): 剪贴板监听程序原理与监听方式

### Community 58 - "ClipItemList preview"
Cohesion: 1.0
Nodes (1): Cursor ClipItemList preview script end-tag fix

### Community 59 - "Baseline"
Cohesion: 1.0
Nodes (1): Baseline

### Community 60 - "热键与多选 搜索修复"
Cohesion: 1.0
Nodes (1): 热键与多选/搜索修复 — 核验说明

### Community 61 - "uTools 内测试验证指南"
Cohesion: 1.0
Nodes (1): uTools 内测试验证指南

### Community 62 - "快速查找路径脚本 修复版"
Cohesion: 1.0
Nodes (1): 快速查找路径脚本（修复版）

### Community 63 - "修复版查找路径脚本 避免变量冲突"
Cohesion: 1.0
Nodes (1): 修复版查找路径脚本（避免变量冲突）

### Community 64 - "剪贴板监听问题排查指南"
Cohesion: 1.0
Nodes (1): 剪贴板监听问题排查指南

### Community 65 - "最终版查找路径脚本 绝对无冲突"
Cohesion: 1.0
Nodes (1): 最终版查找路径脚本（绝对无冲突）

### Community 66 - "查找数据库和监听程序路径"
Cohesion: 1.0
Nodes (1): 查找数据库和监听程序路径

### Community 67 - "ClipboardShelve 底层数据重构分析报告"
Cohesion: 1.0
Nodes (1): ClipboardShelve 底层数据重构分析报告

### Community 68 - "Clipboard 修复计划"
Cohesion: 1.0
Nodes (1): Clipboard 修复计划

### Community 69 - "Clipboard 实施错漏笔记"
Cohesion: 1.0
Nodes (1): Clipboard 实施错漏笔记

### Community 70 - "Clipboard 实现与测试笔记"
Cohesion: 1.0
Nodes (1): Clipboard 实现与测试笔记

### Community 71 - "Clipboard 问题判断"
Cohesion: 1.0
Nodes (1): Clipboard 问题判断

### Community 72 - "Phase 1"
Cohesion: 1.0
Nodes (1): Phase 1 重构实施记录

### Community 73 - "图片和文件收藏备份方案"
Cohesion: 1.0
Nodes (1): 图片和文件收藏备份方案

### Community 74 - "底层数据重构原始需求梳理"
Cohesion: 1.0
Nodes (1): 底层数据重构原始需求梳理

### Community 75 - "键盘导航与懒加载冲突问题分析"
Cohesion: 1.0
Nodes (1): 键盘导航与懒加载冲突问题分析

### Community 76 - "底层数据重构原始需求梳理"
Cohesion: 1.0
Nodes (1): 底层数据重构原始需求梳理

### Community 77 - "WholeTodo"
Cohesion: 1.0
Nodes (1): WholeTodo

### Community 78 - "EzClipboard 当前版本架构与迭代基线说明"
Cohesion: 1.0
Nodes (1): EzClipboard 当前版本架构与迭代基线说明

### Community 79 - "docs VersionDesc"
Cohesion: 1.0
Nodes (1): docs/VersionDesc 说明

### Community 80 - "EzClipboard uTools"
Cohesion: 1.0
Nodes (1): EzClipboard uTools 版本发布说明

### Community 81 - "Universal Intake"
Cohesion: 1.0
Nodes (1): Universal Feature Intake Prompt

### Community 82 - "Specs"
Cohesion: 1.0
Nodes (1): Specs

### Community 83 - "剪贴板预览效果优化 图片"
Cohesion: 1.0
Nodes (1): Feature: 剪贴板预览效果优化（图片 / 文字 / Shift 交互）

### Community 84 - "列表移动与删除修复"
Cohesion: 1.0
Nodes (1): Plan: 列表移动与删除修复

### Community 85 - "列表移动效果与删除状态修复"
Cohesion: 1.0
Nodes (1): Plan: 列表移动效果与删除状态修复

### Community 86 - "验证记录"
Cohesion: 1.0
Nodes (1): 验证记录

### Community 87 - "列表移动与删除修复"
Cohesion: 1.0
Nodes (1): Plan: 列表移动与删除修复

### Community 88 - "列表移动效果优化"
Cohesion: 1.0
Nodes (1): Plan: 列表移动效果优化

### Community 89 - "列表移动效果优化"
Cohesion: 1.0
Nodes (1): Feature: 列表移动效果优化

### Community 90 - "列表导航与多选视觉 方案"
Cohesion: 1.0
Nodes (1): 列表导航与多选视觉 — 方案

### Community 91 - "列表导航与多选视觉 需求"
Cohesion: 1.0
Nodes (1): 列表导航与多选视觉 — 需求

### Community 92 - "tool Prompts"
Cohesion: 1.0
Nodes (1): <tool> Prompts

### Community 93 - "Vite TanStack"
Cohesion: 1.0
Nodes (1): Plan: Vite + TanStack Virtual 列表迁移

### Community 94 - "Vite TanStack"
Cohesion: 1.0
Nodes (1): Feature: Vite + TanStack Virtual 列表迁移

### Community 95 - "最新框架方案适配评估"
Cohesion: 1.0
Nodes (1): 最新框架方案适配评估

### Community 96 - "Community 96"
Cohesion: 1.0
Nodes (1): Tasks

### Community 97 - "收藏标签搜索页 c"
Cohesion: 1.0
Nodes (1): 收藏标签搜索页(c a f)

### Community 98 - "设备页 快捷键展示"
Cohesion: 1.0
Nodes (1): 设备页 快捷键展示

### Community 99 - "清除记录页"
Cohesion: 1.0
Nodes (1): 清除记录页

### Community 100 - "shift 触发预览"
Cohesion: 1.0
Nodes (1): shift 触发预览

### Community 101 - "收藏页 子tab"
Cohesion: 1.0
Nodes (1): 收藏页 子tab

### Community 102 - "收藏页 编辑标签备注"
Cohesion: 1.0
Nodes (1): 收藏页 编辑标签备注

### Community 103 - "文件 跳转来源"
Cohesion: 1.0
Nodes (1): 文件 跳转来源

### Community 104 - "初始页"
Cohesion: 1.0
Nodes (1): 初始页

### Community 105 - "logo"
Cohesion: 1.0
Nodes (1): logo

### Community 106 - "clipboard"
Cohesion: 1.0
Nodes (1): clipboard

### Community 107 - "clipboard"
Cohesion: 1.0
Nodes (1): clipboard

### Community 108 - "format bulleted"
Cohesion: 1.0
Nodes (1): format list bulleted type

### Community 109 - "format bulleted"
Cohesion: 1.0
Nodes (1): format list bulleted type

## Knowledge Gaps
- **129 isolated node(s):** `剪贴板（uTools 插件 `eClipboard`）`, `Specification Quality Checklist: 删除、搜索与列表导航体验修复`, `问题排查：点击/Enter 无法自动粘贴到外部编辑框 & uTools 窗口自动弹出`, `EzClipboard 存储层统一改造计划（审阅版）`, `超级剪贴板 · 简明说明（用户）` (+124 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `vite config copyUToolsPublicAssets`** (2 nodes): `vite.config.js`, `copyUToolsPublicAssets()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `useListNavigation js useListNavigati`** (2 nodes): `useListNavigation.js`, `useListNavigation()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `useVirtualListScroll js useVirtualLi`** (2 nodes): `useVirtualListScroll.js`, `useVirtualListScroll()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `TODO 优化 1`** (2 nodes): `TODO 优化`, `1. 现状要点（代码依据）`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `底层数据重构原始需求梳理 底层数据重构原始需求梳理`** (2 nodes): `底层数据重构原始需求梳理`, `底层数据重构原始需求梳理`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Phase 2 Phase`** (2 nodes): `Phase 2 实施记录：数据库迁移到 uTools DB API`, `Phase 2 实施计划：数据库迁移到 uTools DB API`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `数据展示需求 计划更新 数据展示需求核验修复`** (2 nodes): `数据展示需求 — 计划更新（代码核验基准）`, `数据展示需求核验修复 — 评估优化方案`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `剪贴板预览效果优化 图片 剪贴板预览效果优化`** (2 nodes): `Feature: 剪贴板预览效果优化（图片 / 文字 / Shift 交互）`, `Plan: 剪贴板预览效果优化（图片 / 文字 / Shift 锁定）`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Preview效果优化 Preview效果优化`** (2 nodes): `Feature: Preview效果优化`, `Plan: Preview效果优化`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `列表移动效果优化 列表移动效果优化`** (2 nodes): `Feature: 列表移动效果优化`, `Plan: 列表移动效果优化`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `剪贴板列表键盘移动与选中展示优化 列表键盘移动 分页一致与选中`** (2 nodes): `Feature: 剪贴板列表键盘移动与选中展示优化`, `Plan: 列表键盘移动、分页一致与选中/锁标展示`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `列表移动效果优化 列表移动效果优化`** (2 nodes): `Feature: 列表移动效果优化`, `Plan: 列表移动效果优化`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `Tasks`, `Verify`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `任务清单 验证清单`** (2 nodes): `任务清单`, `验证清单`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `260201 clipboard`** (1 nodes): `260201-cursor-clipboard-event-loop-fix.md`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `babel config`** (1 nodes): `babel.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `vue config`** (1 nodes): `vue.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `test compile`** (1 nodes): `test-compile.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `问题排查 点击`** (1 nodes): `问题排查：点击/Enter 无法自动粘贴到外部编辑框 & uTools 窗口自动弹出`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `EzClipboard 存储层统一改造计划`** (1 nodes): `EzClipboard 存储层统一改造计划（审阅版）`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `EzClipboard`** (1 nodes): `EzClipboard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `tempToFix 方案修订`** (1 nodes): `tempToFix 方案修订（基于用户 3 点澄清）`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `待优化`** (1 nodes): `待优化`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Temp To`** (1 nodes): `Temp To fix`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `EzClipboard 项目全量需求`** (1 nodes): `EzClipboard 项目全量需求、存储、交互与迁移总览`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `搜索框 键入展开`** (1 nodes): `搜索框「键入展开」中文输入法首键问题 — 汇总`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `列表交互优化方案评估`** (1 nodes): `列表交互优化方案评估`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `preview 原始需求`** (1 nodes): `preview 原始需求`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `普通图片预览无效 核验说明`** (1 nodes): `普通图片预览无效 — 核验说明`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Baseline`** (1 nodes): `Baseline`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `当前改动核心逻辑汇总`** (1 nodes): `当前改动核心逻辑汇总`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `快捷键与功能多系统核验`** (1 nodes): `快捷键与功能多系统核验`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `快捷键树形展示功能实现文档`** (1 nodes): `快捷键树形展示功能实现文档`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `剪贴板监听程序原理与监听方式`** (1 nodes): `剪贴板监听程序原理与监听方式`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ClipItemList preview`** (1 nodes): `Cursor ClipItemList preview script end-tag fix`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Baseline`** (1 nodes): `Baseline`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `热键与多选 搜索修复`** (1 nodes): `热键与多选/搜索修复 — 核验说明`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `uTools 内测试验证指南`** (1 nodes): `uTools 内测试验证指南`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `快速查找路径脚本 修复版`** (1 nodes): `快速查找路径脚本（修复版）`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `修复版查找路径脚本 避免变量冲突`** (1 nodes): `修复版查找路径脚本（避免变量冲突）`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `剪贴板监听问题排查指南`** (1 nodes): `剪贴板监听问题排查指南`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `最终版查找路径脚本 绝对无冲突`** (1 nodes): `最终版查找路径脚本（绝对无冲突）`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `查找数据库和监听程序路径`** (1 nodes): `查找数据库和监听程序路径`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ClipboardShelve 底层数据重构分析报告`** (1 nodes): `ClipboardShelve 底层数据重构分析报告`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Clipboard 修复计划`** (1 nodes): `Clipboard 修复计划`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Clipboard 实施错漏笔记`** (1 nodes): `Clipboard 实施错漏笔记`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Clipboard 实现与测试笔记`** (1 nodes): `Clipboard 实现与测试笔记`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Clipboard 问题判断`** (1 nodes): `Clipboard 问题判断`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Phase 1`** (1 nodes): `Phase 1 重构实施记录`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `图片和文件收藏备份方案`** (1 nodes): `图片和文件收藏备份方案`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `底层数据重构原始需求梳理`** (1 nodes): `底层数据重构原始需求梳理`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `键盘导航与懒加载冲突问题分析`** (1 nodes): `键盘导航与懒加载冲突问题分析`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `底层数据重构原始需求梳理`** (1 nodes): `底层数据重构原始需求梳理`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `WholeTodo`** (1 nodes): `WholeTodo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `EzClipboard 当前版本架构与迭代基线说明`** (1 nodes): `EzClipboard 当前版本架构与迭代基线说明`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `docs VersionDesc`** (1 nodes): `docs/VersionDesc 说明`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `EzClipboard uTools`** (1 nodes): `EzClipboard uTools 版本发布说明`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Universal Intake`** (1 nodes): `Universal Feature Intake Prompt`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Specs`** (1 nodes): `Specs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `剪贴板预览效果优化 图片`** (1 nodes): `Feature: 剪贴板预览效果优化（图片 / 文字 / Shift 交互）`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `列表移动与删除修复`** (1 nodes): `Plan: 列表移动与删除修复`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `列表移动效果与删除状态修复`** (1 nodes): `Plan: 列表移动效果与删除状态修复`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `验证记录`** (1 nodes): `验证记录`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `列表移动与删除修复`** (1 nodes): `Plan: 列表移动与删除修复`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `列表移动效果优化`** (1 nodes): `Plan: 列表移动效果优化`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `列表移动效果优化`** (1 nodes): `Feature: 列表移动效果优化`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `列表导航与多选视觉 方案`** (1 nodes): `列表导航与多选视觉 — 方案`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `列表导航与多选视觉 需求`** (1 nodes): `列表导航与多选视觉 — 需求`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `tool Prompts`** (1 nodes): `<tool> Prompts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite TanStack`** (1 nodes): `Plan: Vite + TanStack Virtual 列表迁移`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite TanStack`** (1 nodes): `Feature: Vite + TanStack Virtual 列表迁移`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `最新框架方案适配评估`** (1 nodes): `最新框架方案适配评估`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (1 nodes): `Tasks`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `收藏标签搜索页 c`** (1 nodes): `收藏标签搜索页(c a f)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `设备页 快捷键展示`** (1 nodes): `设备页 快捷键展示`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `清除记录页`** (1 nodes): `清除记录页`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `shift 触发预览`** (1 nodes): `shift 触发预览`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `收藏页 子tab`** (1 nodes): `收藏页 子tab`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `收藏页 编辑标签备注`** (1 nodes): `收藏页 编辑标签备注`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `文件 跳转来源`** (1 nodes): `文件 跳转来源`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `初始页`** (1 nodes): `初始页`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `logo`** (1 nodes): `logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `clipboard`** (1 nodes): `clipboard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `clipboard`** (1 nodes): `clipboard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `format bulleted`** (1 nodes): `format list bulleted type`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `format bulleted`** (1 nodes): `format list bulleted type`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `剪贴板（uTools 插件 `eClipboard`）`, `Specification Quality Checklist: 删除、搜索与列表导航体验修复`, `问题排查：点击/Enter 无法自动粘贴到外部编辑框 & uTools 窗口自动弹出` to the rest of the system?**
  _129 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `EzClipboard Agent Changelog` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `devDbStub js ensureDevDbStub` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `hotkeyLayers js activateLayer` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._