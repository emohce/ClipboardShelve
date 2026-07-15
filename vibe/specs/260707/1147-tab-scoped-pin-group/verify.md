# Tab Scoped Pin Group Verification

Tool: codex

## Result

Implemented and verified for automated coverage, including the 2026-07-15 single-pin/group conflict follow-up. uTools real-shell global trigger remains manual.

## Commands

| Command | Result | Notes |
| --- | --- | --- |
| `node --check src/storage/pinnedItems.js` | pass | Storage module syntax. |
| `node --check src/global/quickPasteRuntime.js` | pass | Runtime module syntax. |
| `node --check test-shortcut-command-system.js` | pass | Test file syntax. |
| `node test-shortcut-command-system.js` | pass | Covers per-Type `pin.group` storage, legacy single-group fallback to `all`, runtime cache isolation, last-active Tab selection, no cross-Type fallback, “one Type miss does not clear another Type cache”, and the follow-up case where a group member is also individually pinned while the pre-save context points to another Tab. Node emitted the existing ESM warning; the test also logs the expected silent-paste unavailable branch. |
| `pnpm run build` | blocked | pnpm 11 stopped at ignored build scripts approval for `esbuild`, `less`, and `vue-demi`; Vite build did not start. The generated approval placeholder was removed because it was not part of this task. |
| `node_modules/.bin/vite build` | pass | Production Vite build completed. Existing PDF.js eval warning remains. |
| `python3 /Users/gdkmjd/work/czz/CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/scripts/audit_code_links.py --root /Users/gdkmjd/work/czz/EzClipboard ...` | pass | Checked task docs, quick-paste knowledge docs, technical details, memory index, and project status. |
| `python3 /Users/gdkmjd/work/czz/CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/scripts/audit_ai_rules.py . --mode project --fix-links` | pass | No unsafe/unresolved project-rule link changes. |
| `python3 /Users/gdkmjd/work/czz/CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/scripts/audit_ai_rules.py . --mode project` | pass | Read-only project-rule audit passed. |

## Closeout Checklist

- [x] `node test-shortcut-command-system.js`
- [x] `node_modules/.bin/vite build`
- [x] `pnpm run build` attempted and blocked before Vite by ignored-builds approval.
- [x] Code link audit for task docs and knowledge docs.
- [x] Project AI rule audit.
- [x] Manual uTools path documented as not run.

## Implementation Sync

| Layer | Implemented Behavior | Evidence |
| --- | --- | --- |
| Storage | `pin.group` is normalized to a versioned envelope with `currentType` and `groups[type]`; old single-group data is read as `all`. | [src/storage/pinnedItems.js](../../../../src/storage/pinnedItems.js#L1) |
| Main UI | Active list prepends only the active Tab's synthetic group item; save/clear/paste operate on current Tab type; deleting records removes ids from all group buckets. | [src/views/Main.vue](../../../../src/views/Main.vue#L1) |
| Runtime | `quick-paste-pin-group` chooses cache/storage by `pin.lastActiveContext.tab`, advances only that bucket cursor, and does not fallback across Tab types. | [src/global/quickPasteRuntime.js](../../../../src/global/quickPasteRuntime.js#L1) |
| UI save/context bridge | Saving a group passes the live filter context; storage normalizes its Tab to the saved group Type. Runtime cursor-only saves omit this option and therefore do not rewrite context. | [src/views/Main.vue](../../../../src/views/Main.vue#L1337), [src/storage/pinnedItems.js](../../../../src/storage/pinnedItems.js#L175) |
| Tests | Added storage and runtime assertions to the existing shortcut command test. | [test-shortcut-command-system.js](../../../../test-shortcut-command-system.js#L1) |

## Cache Boundary Note

Global quick-paste hotkeys are cache consumers. They may advance the matching cursor for loop semantics, but they must not clear the full runtime cache. A no-match result for `text` must leave the `image` / `all` / `collect` buckets intact. Future Pad / Tab / Type projection concepts must preserve this scoped-cache rule.

## Manual Verification Gap

Not run in a real uTools shell:

- 在“全部”创建组合，切到“图片/文字/收藏”确认不显示该组合。
- 分别在“图片”和“收藏”创建组合，确认各 Tab 只显示自己的组合。
- 退出前停留在不同 Tab 后触发全局“循环粘贴组合项”，确认粘贴对应 Tab 组合；目标 Tab 无组合时只隐藏窗口不粘贴。
- 在“全部”中把若干已单项置顶条目保存为组合，随后直接触发全局“循环粘贴组合项”，确认从组合首项开始循环；再切到无组合 Tab，确认仍不跨 Type fallback。

## Follow-up Root Acceptance（2026-07-15）

- `pin.item.map` overlap: accepted as supported, not causal.
- verified failure condition: saved group Type and `pin.lastActiveContext.tab` drift.
- accepted fix: synchronize `activeContext` only on UI group save.
- rejected alternative: cross-Type fallback.
- delegated read-only results: source mapping and executable comparison accepted after Root rechecked decisive source and ran the focused test/build; usage unavailable.
- document impact: `requirement-canonical`; synchronized existing raw/spec/traceability, project-current hub, canonical quick-paste knowledge, technical details, and project error memory.

## Follow-up Closeout Checks（2026-07-15）

| Check | Result | Scope / Residual |
| --- | --- | --- |
| Focused shortcut/group regression | pass | Covers individually pinned member overlap, stale pre-save Tab context, immediate same-Type trigger, and preserved no-fallback behavior. |
| Production Vite build | pass | Existing PDF.js eval warning only. |
| Changed-document code-link audit | pass | Task docs, quick-paste knowledge, technical details, error-memory index/record, and project status. |
| Project AI-rule audit | blocked by pre-existing baseline | Reports missing project-level CodeNote process/template acceptance markers; no task code or changed quick-paste document is identified. Not expanded in this bug fix. |
| uTools real-shell loop trigger | not run | Requires the user's installed uTools global feature binding and target application focus. |

## Closeout Reviewer

- `missing_required_updates`: none after docs and audits complete.
- `optional_improvements`: future UI text could include active Tab label in the synthetic group row, but current compact display preserves existing UI density.
- `memory_routing_decision`: updated project knowledge docs and added [EM-2026-07-15](../../../knowledge/error-memory/2026-07-15-pin-group-active-context-bucket-drift.md) because the verified context/bucket drift is a reusable failure pattern.
- `risk_gates`: no DB/SQL, production, credential, publish, or external-service writes.
- `verification_required`: automated test, build, code-link audit, AI-rule audit, uTools manual path documented.
- `evolution_candidates`: promoted to `quick-paste-runtime.md` and `quick-paste-pin-group-cache.md`.

## Evolution Candidate

| Evidence | Candidate | Target | Decision |
| --- | --- | --- | --- |
| User required per-Type grouping and no cross-Tab display | Pin-group storage/cache/display is top-level Tab scoped | [../../../knowledge/quick-paste-runtime.md](../../../knowledge/quick-paste-runtime.md), [../../../knowledge/quick-paste-pin-group-cache.md](../../../knowledge/quick-paste-pin-group-cache.md) | Promoted after tests/build. |
| User reported pinned-member group trigger failure | UI group save synchronizes the saved Type into active context without cross-Type fallback | [../../../knowledge/quick-paste-runtime.md](../../../knowledge/quick-paste-runtime.md), [../../../knowledge/error-memory/2026-07-15-pin-group-active-context-bucket-drift.md](../../../knowledge/error-memory/2026-07-15-pin-group-active-context-bucket-drift.md) | Promoted after focused regression/build. |
