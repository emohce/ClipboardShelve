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

Time window: 2026-06-11 to 2026-06-13.

Current focus: UI interaction optimization v1.2.1 completed, right-click unification first-stage completed, shortcut command redesign main line continues; quick paste pin top/group global silent runtime fix completed and verified on 2026-06-13.

Current core task: UI interaction optimization evaluation completed and documented; right-click unification first-stage completed and verified; quick paste pin top/group commands now use a global silent runtime instead of `Main.vue` mounted state. Recommended next candidates are uTools production-shell migration verification, macro conflict preview, or `registerCommandFeaturePair()` fallback cleanup.

Completed milestones:

- UI interaction optimization (v1.2.1): All 9 requirements implemented including pin/group features, page scroll shortcuts, cache navigation, uTools global commands, and hotkey runtime refresh.
- Right-click unification first-stage: Menu model unified, entry and execution aligned, settings-page management added, automated and browser verification completed.
- Quick paste pin stability fix: `quick-paste-top` priority, global silent runtime, latest DB reuse, serial execution, short uTools command labels, `onPluginEnter` multiplexing, and pin-group resolvable-cursor bounds covered by automated tests and build verification.
- Evaluation documentation: Comprehensive evaluation report updated with right-click unification progress.

## Task Reference Index

| Task | Status | Read first | Update when |
|------|--------|------------|-------------|
| Shortcut command redesign | active / main line | [260610-shortcuts-redesign/12YG2-zz-summary-快捷键重构全景文档.md](260610-shortcuts-redesign/12YG2-zz-summary-快捷键重构全景文档.md) | Command, keybinding, when, resolver, SQLite shortcut, macro, or command-entry behavior changes. |
| Right-click unification | completed first stage / reference | [260612-right-click-unification/01-plan.md](260612-right-click-unification/01-plan.md) | Right-click action model, drawer order, numeric execution, settings-page management, verification, or handoff changes. |
| UI interaction optimization | completed / reference | [260610-ui交互优化/评估报告-2026-06-11.md](260610-ui交互优化/评估报告-2026-06-11.md) | Only when a regression or explicit new UI interaction task reopens the behavior. |
| Documentation and memory governance | active / infrastructure | [../knowledge/MEMORY_INDEX.md](../knowledge/MEMORY_INDEX.md), [0000-template/README.md](0000-template/README.md) | Process rules, task templates, memory routing, or active task status changes. |
| Storage performance rewrite | reference / risk area | [260609-performance-rewrite/README.md](260609-performance-rewrite/README.md) | Storage, migration, repeat-import, SQLite fallback, or repository facade behavior changes. |

## Required Workflow

1. Before implementation, read the relevant row in this hub and then open the referenced task document.
2. For medium or larger work, cite [../knowledge/MEMORY_INDEX.md](../knowledge/MEMORY_INDEX.md) from the task spec or plan.
3. Update this hub only when current focus, task status, authoritative document, or closeout requirement changes.
4. Keep task details out of this hub. Put scope, non-goals, implementation path, tasks, verification, and handoff in the task directory.
5. Route reusable memory through [../knowledge/MEMORY_INDEX.md](../knowledge/MEMORY_INDEX.md); keep one-off evidence in the task document.
6. When continuing the main line, explicitly name the current core task here and keep this hub synchronized with the authoritative task document before final delivery.
