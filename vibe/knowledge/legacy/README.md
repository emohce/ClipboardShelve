# Legacy Document Map

Tool: codex

This file maps historical document locations after the CodeNote master-rule migration. It does not delete old documents.

| Legacy path | Markdown count | Current handling |
| --- | ---: | --- |
| `历史规则目录` | 11 | Historical source; extract current facts into `vibe/rules/`, `vibe/knowledge/`, `vibe/specs/`, or `vibe/ai-db/` as appropriate |
| `vibe/knowledge/legacy/` | 21 | Historical source; extract current facts into `vibe/rules/`, `vibe/knowledge/`, `vibe/specs/`, or `vibe/ai-db/` as appropriate |
| `docs/` | 52 | Historical source; extract current facts into `vibe/rules/`, `vibe/knowledge/`, `vibe/specs/`, or `vibe/ai-db/` as appropriate |

## Sample Files

### `历史规则目录`
- `00-error-memory.md` (legacy rule file)
- `00-writing-style.md` (legacy rule file)
- `01-spec-extraction.md` (legacy rule file)
- `02-architecture-planning.md` (legacy rule file)
- `03-task-decomposition.md` (legacy rule file)
- `04-implementation-constraints.md` (legacy rule file)
- `05-verification-checklist.md` (legacy rule file)
- `06-change-log-format.md` (legacy rule file)
### `vibe/knowledge/legacy/`
- `vibe/knowledge/adr/2026-04-06-scroll-path-choice.md`
- `vibe/knowledge/adr/2026-04-14-search-preference-and-enter-filter-rule.md`
- `vibe/knowledge/adr/README.md`
- `vibe/knowledge/adr/_template.md`
- `vibe/knowledge/error-memory/2026-04-06-hideMainWindow-showMainWindow-api-race.md`
- `vibe/knowledge/error-memory/2026-04-06-json-db-debounce-persist.md`
- `vibe/knowledge/error-memory/2026-04-06-scroll-path.md`
- `vibe/knowledge/error-memory/2026-04-08-clipboard-nav-scroll-search-layout.md`
### `docs/`
- `docs/260409-cursor-idea-alias-principle.md`
- `docs/260409-cursor-idea-alias-verify.md`
- `docs/EzClipboardIntro.md`
- `docs/VersionDesc/20260331-v0-当前版本架构与迭代基线说明.md`
- `docs/VersionDesc/README.md`
- `docs/VersionDesc/utools-release/20260331-vNext-utools版本发布说明.md`
- `docs/design/tempToFix-方案-修订.md`
- `docs/design/tempToFix.md`

## Cleanup Rule

Before removing or rewriting old documents, preserve reusable conclusions in the current authoritative location and add links between old and new docs.
