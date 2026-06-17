# EzClipboard Developer Soul

Tool: codex

## Purpose

This document captures the product, engineering, UI, configuration, performance, and AI-collaboration taste that should guide EzClipboard development. It is a project-level memory: concrete enough to shape future work, but not a replacement for task specs, tests, or runtime evidence.

Read this before medium or larger work touching architecture, UI, interaction, configuration, storage, shortcuts, previews, or AI rules.

## How To Apply

Before changing code or rules, translate this soul into task-specific checks:

- Product fit: does the change preserve compact utility speed instead of turning the app into a showcase UI?
- Runtime path: which entrypoint, event chain, repository, preload API, or component owns the behavior?
- Interaction safety: what happens to keyboard flow, focus, IME, overlay layers, preview movement, and delete recovery?
- Observability: can the user or maintainer see storage mode, fallback source, risk, migration state, or command source when it matters?
- Verification: which focused script, rule audit, build, browser check, or uTools manual path would catch a regression?

If a proposed improvement cannot answer these checks, treat it as taste-risk until the missing runtime evidence is gathered.

## System Design Thought

EzClipboard is a high-frequency desktop utility, not a showcase application. The first design obligation is throughput: a user should scan, search, preview, copy, paste, lock, collect, delete, configure, and recover state with minimal cognitive and visual friction.

The system favors named capabilities over incidental UI actions. A shortcut is not the capability; the command is. The command/keybinding/when/layer/risk model turns operations into visible, editable, testable system facts, with runtime dispatch centered in [hotkeyRegistry.js](../../src/global/hotkeyRegistry.js:1) and command definitions in [commandDefaults.js](../../src/global/commandDefaults.js:1).

Runtime paths matter more than surface symptoms. UI behavior, storage behavior, uTools preload assets, and shortcut dispatch must be understood through their true entrypoints: [main.js](../../src/main.js:1), [initPlugin.js](../../src/global/initPlugin.js:1), [ClipItemList.vue](../../src/cpns/ClipItemList.vue:1), [Setting.vue](../../src/views/Setting.vue:1), and [utools-runtime-assets.mjs](../../scripts/utools-runtime-assets.mjs:1).

## Interaction Taste

The main window should feel like an efficient workbench:

- Dense list first, decoration second.
- Keyboard flow is a primary interface, not an accessibility afterthought.
- Search, IME, focus, overlay, drawer, preview, and delete recovery are part of one interaction contract.
- Preview is a low-interruption aid: Shift hover preview, directional scrolling, and rich file preview should reveal enough information without turning the clipboard into a document editor.
- Destructive or persistent operations must keep business guards in handlers even when `when` and shortcut configuration become expressive.

Do not trade stable high-frequency behavior for visual simplification. The fixed top bar, search reveal guard, local list scroll container, IME guards, delete anchor recovery, and setting-page editable guards exist because they preserve real workflows, not because they are incidental implementation details.

## UI Aesthetic

The preferred UI style is quiet, precise, compact, and operational. EzClipboard should look like a mature desktop tool:

- Low-saturation neutrals, one controlled accent, clear active/hover/disabled states.
- Compact surfaces with readable hierarchy, not large-card marketing composition.
- Settings pages as worktables: searchable, filterable, risk-marked, source-visible, and explainable.
- Overlays and dialogs should clarify state without stealing unrelated keyboard behavior.
- Visual polish must preserve scan speed, target reliability, and uTools small-window constraints.

Good UI in this project translates system complexity into visible structure. The shortcut settings table is not just a settings page; it explains command id, scope, keybinding, `when`, source, risk, fallback, and macro state to the user.

## Configuration Philosophy

Configuration should be observable, reversible, and layered:

- System defaults are release facts.
- User overrides are personal facts.
- SQLite is preferred where structure and migration matter.
- Fallback paths must remain visible instead of silent.
- Risky commands should be marked as risky in UI and data.
- Device-local and public/shared shortcut profiles must remain distinguishable.

Do not hide storage mode, migration state, fallback source, or error text behind a secondary route when that information affects data safety or user trust.

## Performance View

Performance is not a single optimization. It comes from splitting hot paths:

- Query and persistence should go through repository boundaries such as [clipboardRepository.js](../../src/storage/clipboardRepository.js:1) and [sqliteClipboardRepository.js](../../src/storage/sqliteClipboardRepository.js:1).
- Long lists need local scroll containers, cache-aware refresh, and bounded re-rendering.
- Search should use explicit indexes and avoid meaningless base64 scans.
- File preview should classify, limit, cache, and degrade by type and size through [filePreview.mjs](../../src/utils/filePreview.mjs:1) and [FileRichPreview.vue](../../src/cpns/FileRichPreview.vue:1).
- uTools runtime assets should have a single generation source, not drift between dev and build.

Performance work should identify the hot path before changing code. "Use virtual scrolling" is not a complete answer if storage, serialization, search, image reads, or migration still block the workflow.

## Documentation And AI Collaboration

Documentation is part of the development runtime for humans and AI:

- [PROJECT_STATUS.md](../specs/PROJECT_STATUS.md) is the process hub, not a dumping ground.
- [MEMORY_INDEX.md](MEMORY_INDEX.md) is the reusable knowledge router.
- Error memories preserve disproven concepts and correct detection order.
- Specs and verification records preserve task-local scope and evidence.
- Rule adapters route tools; authoritative rules stay in [vibe/rules/](../rules/README.md) and the CodeNote master rules.

AI work should load the smallest relevant context, make changes through existing module boundaries, and close with verification plus memory routing. A change is not "done" because it is visually plausible; it is done when its affected runtime path and regression surface have been checked.

The preferred AI behavior is conservative but not timid: improve the system when evidence supports it, and avoid broad redesign when a local root-cause fix preserves the product's operating rhythm.

## 禁止退化方向

- Do not convert the main panel into a spacious landing-page-like UI.
- Do not remove density, keyboard reachability, IME protection, editable-target protection, or delete-anchor recovery for cosmetic neatness.
- Do not bypass repository facades for new list/search/delete/storage behavior.
- Do not add a second source for uTools runtime assets.
- Do not make SQLite or structured configuration a hard failure when a safe fallback is expected.
- Do not let configurable shortcuts weaken handler-level data safety.
- Do not create parallel long-term docs when an authoritative memory or rule index already exists.
- Do not promote unverified preference into project rules without code, test, user-confirmed, or process evidence.

## Evidence Basis

- `code`: current implementation in [src/main.js](../../src/main.js:1), [utools-runtime-assets.mjs](../../scripts/utools-runtime-assets.mjs:1), and active storage/shortcut/preview modules.
- `test`: recent task verification records under [260616-rich-file-preview](../specs/260616-rich-file-preview/04-verify.md) and shortcut command tests referenced by [shortcut redesign summary](../specs/260610-shortcuts-redesign/12YG2-zz-summary-快捷键重构全景文档.md).
- `user-confirmed`: explicit request on 2026-06-17 to extract and persist the project and master "developer soul" so future AI development is taste-first.
- `inference`: the wording above distills recurring project decisions; future work should still verify concrete runtime paths before editing.
