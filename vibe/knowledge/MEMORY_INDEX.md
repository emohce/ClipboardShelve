# Memory Reference Index

Tool: codex

## Purpose

This index is the project-level entry for reusable memories. Tasks should link to this file instead of searching every historical document first.

## Global Memory Sources

| Scope | Location | Use When |
|-------|----------|----------|
| Cross-project rules | [../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/VibeAi.md](../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/VibeAi.md) | General AI workflow, process, testing, memory, safety, and documentation rules. |
| Project rules | [../rules/README.md](../rules/README.md) | EzClipboard-specific constraints, task loading, verification, and high-risk areas. |
| Project architecture | [ARCHITECTURE.md](ARCHITECTURE.md) | Stable architecture, module boundaries, runtime assumptions, and business behavior. |
| Quick paste runtime (top + group) | [quick-paste-runtime.md](quick-paste-runtime.md) | **Read first** when modifying `quick-paste-top`, `quick-paste-pin-group`, silent paste API, bootstrap pending, or product selection rules. |
| Quick paste pin group cache | [quick-paste-pin-group-cache.md](quick-paste-pin-group-cache.md) | Pin-group runtime cache shape, update timing, and hot-path id-resolution limits (subsection of quick paste runtime). |
| Error memories | [error-memory/README.md](error-memory/README.md) | Past failures, guardrails, and repeat-risk implementation details. |
| ADRs | [adr/README.md](adr/README.md) | Accepted decisions and tradeoffs that should not be rediscovered. |
| Active process hub | [../specs/PROJECT_STATUS.md](../specs/PROJECT_STATUS.md) | Current progress, active task docs, and latest implementation focus. |
| Legacy sources | [legacy/README.md](legacy/README.md) | Historical context only; promote useful conclusions before relying on them. |

## Task Memory Protocol

Each medium or larger task should include a `Knowledge Context` section in its spec or plan:

- `required`: links that must be read before implementation.
- `related`: links that may affect edge cases or prior decisions.
- `new memory candidates`: facts discovered during work that may need promotion.
- `memory routing`: none, project memory, error memory, ADR, DB memory, or needs user confirmation.

## Promotion Rules

- Promote only reusable, verified, safe knowledge.
- Prefer updating an existing authoritative memory over creating duplicates.
- Keep task-specific investigation details in `vibe/specs/<task-id>/`; promote only the compact rule, decision, or failure pattern.
- When memory affects future implementation, link it from this index or an index linked here.
