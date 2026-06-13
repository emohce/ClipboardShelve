# Documentation Rules

Tool: codex

## Purpose

Define EzClipboard-specific documentation routing. Cross-project principles stay in the CodeNote master rules; this file only maps those principles onto this repository.

## Documentation Layers

| Layer | Location | Role |
|---|---|---|
| Global master | [../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/VibeAi.md](../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/VibeAi.md) | Cross-project AI workflow, safety, memory, verification, and documentation rules. |
| Project adapters | [../../AGENTS.md](../../AGENTS.md), [context-loading.md](context-loading.md), [../../.agents/skills/ezclipboard-rules/SKILL.md](../../.agents/skills/ezclipboard-rules/SKILL.md) | Route tools to the authoritative rule tree without copying master rules. |
| Project rules | [README.md](README.md), [project.md](project.md), [workflow.md](workflow.md), [knowledge.md](knowledge.md), [documentation.md](documentation.md) | EzClipboard stack, risk boundaries, commands, verification, and documentation governance. |
| Process hub | [../specs/PROJECT_STATUS.md](../specs/PROJECT_STATUS.md) | Current main line, active task index, authoritative task docs, and closeout requirements. |
| Task docs | [../specs/](../specs/) | Requirements, plans, audits, verification records, handoffs, and task-local evidence. |
| Project knowledge | [../knowledge/MEMORY_INDEX.md](../knowledge/MEMORY_INDEX.md) | Reusable project memories, ADR routing, error memories, and architecture facts. |

## Write Policy

- Keep project-specific facts in this repository; keep reusable cross-project rules in CodeNote.
- Use [../specs/PROJECT_STATUS.md](../specs/PROJECT_STATUS.md) as the routing surface for current work, not as a detailed implementation log.
- Put detailed scope, implementation notes, verification, and handoff in task directories under [../specs/](../specs/).
- Promote only reusable, verified, safe knowledge through [../knowledge/MEMORY_INDEX.md](../knowledge/MEMORY_INDEX.md).
- Write Markdown links relative to the document location and include line suffixes for implementation evidence.
- Do not create new DB documentation workspaces unless project rules explicitly introduce `vibe/ai-db/`.

## Task Thresholds

- Small rule-only edits: update the affected rule file and run the project AI rule audit.
- Medium or larger documentation changes: update or create a task document under [../specs/](../specs/) and validate code links when citing implementation files.
- Business, storage, command, UI interaction, or architecture changes: keep the relevant task document synchronized and update [../specs/PROJECT_STATUS.md](../specs/PROJECT_STATUS.md) when focus, status, or authoritative docs change.

## Closeout

Every task touching documentation must report:

- Verification performed or skipped with reason.
- Memory routing: none, project memory, error archive, ADR, DB memory, or needs user confirmation.
- Process document status: not needed, created, updated, compacted, or archived.
