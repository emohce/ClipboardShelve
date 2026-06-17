# Project Status Hub

Tool: codex

## Purpose

This is the minimal project process hub. It should only answer three questions:

- What is the current main line?
- What is the current core task?
- Which task document is authoritative?
- What must be updated before closing work?

Detailed requirements, plans, evidence, and implementation notes stay in task directories or memory indexes.

## Current Main Line

Time window: 2026-06-17.

Current focus: Rich file preview — **代码、测试、发布记录和项目记忆已完成；PDF 走 uTools Sharp 第 1 页快路径 + PDF.js 后台补页；TXT/MD/ADOC/CSV/JSON/YAML 异步首段读取，`.txt` / 无扩展名保守自动识别 JSON/YAML/CSV/AsciiDoc/Markdown，普通文本 Shift 预览在所有 tab 下按内容显示结构化树、表格或 HTML，DOCX/XLSX 异步二进制读取，PPTX/PPSX 低保真文本预览，非 PDF 解析结果运行期缓存；待 uTools 真实文件复测确认** ([260616-rich-file-preview/01-spec.md](260616-rich-file-preview/01-spec.md), [260616-rich-file-preview/02-plan.md](260616-rich-file-preview/02-plan.md), [260616-rich-file-preview/04-verify.md](260616-rich-file-preview/04-verify.md)).

Current core task: 常见文件富预览扩展。Authoritative docs: [260616-rich-file-preview/01-spec.md](260616-rich-file-preview/01-spec.md), [260616-rich-file-preview/02-plan.md](260616-rich-file-preview/02-plan.md), [260616-rich-file-preview/04-verify.md](260616-rich-file-preview/04-verify.md).

Completed milestones:

- UI interaction optimization (v1.2.1): All 9 requirements implemented including pin/group features, page scroll shortcuts, cache navigation, uTools global commands, and hotkey runtime refresh.
- Right-click unification first-stage: Menu model unified, entry and execution aligned, settings-page management added, automated and browser verification completed.
- Quick paste: global silent runtime for `quick-paste-top` / `quick-paste-pin-group` — [../knowledge/quick-paste-runtime.md](../knowledge/quick-paste-runtime.md).
- Command macro: paste-like steps use `macroSettleAfterMs` between steps.
- Evaluation documentation: Comprehensive evaluation report updated with right-click unification progress.
- Setting page UI + multi-key binding (2026-06-13): Layout/overlay baseline, command-level `shortcutIds[]`, reservation rules, record dialog refactor — [260613-SettingUiModify/260613-shortcut-multi-key-plan.md](260613-SettingUiModify/260613-shortcut-multi-key-plan.md).
- Compact shortcut semantics (2026-06-14): default/runtime shortcut ids migrated to `c/s/a` + key-token form, legacy override migration preserved, Tab/Space fixed-key rules added — [260613-SettingUiModify/260614-shortcut-compact-semantics.md](260613-SettingUiModify/260614-shortcut-compact-semantics.md).
- Recheck closeout (2026-06-14): fixed-key no-context recorder guard covered for command record and macro draft validation path; authoritative docs now point to compact storage semantics.
- Layer priority blocking (2026-06-14): `mainFocus` and resolver priority use static layer ordering; setting child overlays use internal feature-only wildcard blockers that stay out of command profiles and shortcut settings UI — [260610-shortcuts-redesign/14YG2-zz-plan-层级判断统一.md](260610-shortcuts-redesign/14YG2-zz-plan-层级判断统一.md).
- Main page navigation recheck (2026-06-14): `a-u` / page-up default chain verified; observed failure was user shortcut override, not mapping, handler, scroll path, or layer penetration. Future triage checks runtime overrides before code paths — [260610-shortcuts-redesign/14YG2-zz-plan-层级判断统一.md](260610-shortcuts-redesign/14YG2-zz-plan-层级判断统一.md#翻页失效排查顺序).
- Shortcut config management (2026-06-14): feature-config page now manages `shortcutSync` local/public profiles; each device keeps a local profile, can choose public runtime source, and can explicitly promote local config to public — [260610-shortcuts-redesign/12YG2-zz-summary-快捷键重构全景文档.md](260610-shortcuts-redesign/12YG2-zz-summary-快捷键重构全景文档.md).
- Main list multi-delete recovery (2026-06-14): multi-delete now separates retained item recovery (`preferItemId`) from parent refresh index, removes deleted rows from visible cache, rewinds loaded cursors, and only fills one page instead of rebuilding the first page — [../vibe-doc/ai-error-memory/2026-04-08-clipboard-nav-scroll-search-layout.md](../vibe-doc/ai-error-memory/2026-04-08-clipboard-nav-scroll-search-layout.md).
- Preview optimization (2026-06-16): completed and reviewed; text preview switches from single-line ellipsis to logical-line wrapping, image preview now tests full-fit / <=2x shrink before extreme-ratio scroll strategy — [260616-preview-optimization/05-review.md](260616-preview-optimization/05-review.md).
- Rich file preview (2026-06-17): implemented and optimized; file records now route to a rich preview model for PDF/MD/AsciiDoc/CSV/JSON/YAML/Excel/DOCX/PPTX/text, with command-compatible accelerated preview scrolling, safer PDF lifecycle handling, `pdfjs-dist@2.6.347` es5 runtime compatibility, uTools Sharp PDF first-page fast path, async document preview reads, `.txt` / no-extension content auto-detection, plain text content-level rich preview across tabs, structured JSON/YAML tree preview, low-fidelity PPTX text preview, non-PDF preview cache, and PDF.js fallback/page-fill behavior — [260616-rich-file-preview/01-spec.md](260616-rich-file-preview/01-spec.md).
- Developer soul / AI rule refinement (2026-06-17): project-level engineering taste and CodeNote master taste rules added; future medium+ architecture, UI, interaction, configuration, storage, performance, and AI-rule work should load [../knowledge/developer-soul.md](../knowledge/developer-soul.md) through the project rule router.

Open follow-ups:

- uTools production-shell first-run shortcut migration, restart override persistence, and `shortcutSync` multi-device local/public data-shape verification.
- Macro conflict preview UX: keep conflict confirmation separate from command record hard-block behavior.

## Task Reference Index

| Task | Status | Read first | Update when |
|------|--------|------------|-------------|
| Rich file preview | completed / pending uTools real-file verification | [260616-rich-file-preview/01-spec.md](260616-rich-file-preview/01-spec.md), [260616-rich-file-preview/02-plan.md](260616-rich-file-preview/02-plan.md), [260616-rich-file-preview/04-verify.md](260616-rich-file-preview/04-verify.md) | File rich preview types, file preview parser dependencies, Shift preview scroll acceleration, or preview command labels change. |
| Preview optimization | completed / reference | [260616-preview-optimization/01-spec.md](260616-preview-optimization/01-spec.md), [260616-preview-optimization/02-plan.md](260616-preview-optimization/02-plan.md), [260616-preview-optimization/04-verify.md](260616-preview-optimization/04-verify.md), [260616-preview-optimization/05-review.md](260616-preview-optimization/05-review.md) | Text preview wrapping, image preview layout, Shift preview movement, or hover preview behavior changes. |
| Shortcut command redesign | completed / reference | [260610-shortcuts-redesign/12YG2-zz-summary-快捷键重构全景文档.md](260610-shortcuts-redesign/12YG2-zz-summary-快捷键重构全景文档.md), **改键多键** [260613-SettingUiModify/260613-shortcut-multi-key-plan.md](260613-SettingUiModify/260613-shortcut-multi-key-plan.md), **compact 语义** [260613-SettingUiModify/260614-shortcut-compact-semantics.md](260613-SettingUiModify/260614-shortcut-compact-semantics.md) | Command, keybinding, when, resolver, SQLite shortcut, macro, record dialog, multi-key, compact shortcut id, fixed-key guard, or conflict behavior changes. |
| Right-click unification | completed first stage / reference | [260612-right-click-unification/01-plan.md](260612-right-click-unification/01-plan.md) | Right-click action model, drawer order, numeric execution, settings-page management, verification, or handoff changes. |
| UI interaction optimization | completed / reference | [260610-ui交互优化/评估报告-2026-06-11.md](260610-ui交互优化/评估报告-2026-06-11.md) | Only when a regression or explicit new UI interaction task reopens the behavior. |
| Setting page UI modify | completed / reference | [260613-SettingUiModify/260613-zz-raw-settingUiModify.md](260613-SettingUiModify/260613-zz-raw-settingUiModify.md), [260613-SettingUiModify/260613-shortcut-multi-key-plan.md](260613-SettingUiModify/260613-shortcut-multi-key-plan.md) | Layout/overlay baseline; multi-key record dialog + cmd override model implemented. |
| Documentation and memory governance | active / infrastructure | [../knowledge/MEMORY_INDEX.md](../knowledge/MEMORY_INDEX.md), [0000-template/README.md](0000-template/README.md) | Process rules, task templates, memory routing, or active task status changes. |
| Developer soul / AI taste rules | active / infrastructure | [../knowledge/developer-soul.md](../knowledge/developer-soul.md), [../knowledge/MEMORY_INDEX.md](../knowledge/MEMORY_INDEX.md) | Project engineering taste, UI/product judgment, configuration philosophy, performance view, or AI-rule routing changes. |
| Storage performance rewrite | reference / risk area | [260609-performance-rewrite/README.md](260609-performance-rewrite/README.md) | Storage, migration, repeat-import, SQLite fallback, or repository facade behavior changes. |

## Required Workflow

1. Before implementation, read the relevant row in this hub and then open the referenced task document.
2. For medium or larger work, cite [../knowledge/MEMORY_INDEX.md](../knowledge/MEMORY_INDEX.md) from the task spec or plan.
3. Update this hub only when current focus, task status, authoritative document, or closeout requirement changes.
4. Keep task details out of this hub. Put scope, non-goals, implementation path, tasks, verification, and handoff in the task directory.
5. Route reusable memory through [../knowledge/MEMORY_INDEX.md](../knowledge/MEMORY_INDEX.md); keep one-off evidence in the task document.
6. When continuing the main line, explicitly name the current core task here and keep this hub synchronized with the authoritative task document before final delivery.
