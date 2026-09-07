<!-- codenote-local-context:conditional-v3 -->
# Project context

Project-owned conditional detail. Edit this local owner for project-specific facts; global policy stays in the compact core. Commands and inline paths are relative to the repository root unless their original text says otherwise. Read the sections relevant to the affected surface before material work.

## Project context from AGENTS.md

# EzClipboard AI Adapter

Conditional task routes (read only for the affected surface; reuse already-loaded owners):
- [../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/VibeAi.md](<../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/VibeAi.md>)
- [vibe/rules/README.md](<README.md>)
- [vibe/rules/context-loading.md](<context-loading.md>)
- [vibe/rules/documentation.md](<documentation.md>)
- [vibe/specs/PROJECT_STATUS.md](<../specs/PROJECT_STATUS.md>)
- [.agents/skills/ezclipboard-rules/SKILL.md](<../../.agents/skills/ezclipboard-rules/SKILL.md>)

Hard constraints:
- Keep project-specific rules in `vibe/rules/`; do not copy the CodeNote master into this repository.
- Preserve existing behavior and user changes; do not touch unrelated business code.
- High-risk actions require confirmation: DB writes, deletes, production changes, credentials, publish/deploy, or external service writes.
- Write Markdown links relative to the target document location.
- Cursor, Codex, Windsurf, and other AI tools must use adapter files only as routing surfaces; authoritative project rules stay in `vibe/rules/`, and cross-project rules stay in CodeNote.
- Load task-specific memories through `.agents/skills/ezclipboard-rules/SKILL.md` instead of pasting all rules into every prompt.
- Knowledge hygiene ([vibe/rules/documentation.md](<documentation.md#knowledge-hygiene权威文档原则>)): formal docs keep correct knowledge and misconception concepts only; drop stale references, intermediate artifacts, and wrong-code traces.

## Project context from vibe/rules/README.md

# EzClipboard AI Rules

## Conditional task routes

- CodeNote rule index: [../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/README.md](<../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/README.md>)
- Project developer soul: [../knowledge/developer-soul.md](<../knowledge/developer-soul.md>)
- Project rules: [project.md](<project.md>)
- Workflow rules: [workflow.md](<workflow.md>)
- Knowledge routing: [knowledge.md](<knowledge.md>)
- Context loading and tool adapters: [context-loading.md](<context-loading.md>)
- Documentation routing: [documentation.md](<documentation.md>)

## Rule Boundary

- CodeNote stores cross-project AI collaboration rules.
- This project stores only project-specific stack, commands, paths, business rules, risk areas, and verification notes.
- Legacy AI rules are preserved under `vibe/knowledge/legacy/` when replaced by this structure.
- Tool-specific adapters are discovery surfaces only; the authoritative rule tree remains this directory plus CodeNote.
- Documentation layering is defined in [documentation.md](<documentation.md>); keep task details in `vibe/specs/` instead of adapters.
- For medium or larger architecture, UI, interaction, configuration, storage, performance, and AI-rule tasks, read [../knowledge/developer-soul.md](<../knowledge/developer-soul.md>) before proposing changes.
- Knowledge hygiene: see [documentation.md#Knowledge-Hygiene](<documentation.md#knowledge-hygiene权威文档原则>).

## Task Closeout

- Verification performed or skipped with reason.

## Project context from .cursor/rules/ezclipboard.mdc

# EzClipboard Cursor Adapter

Conditional task routes (read only for the affected surface; reuse already-loaded owners):

- [../../AGENTS.md](<../../AGENTS.md>)
- [../../vibe/rules/README.md](<README.md>)
- [../../.agents/skills/ezclipboard-rules/SKILL.md](<../../.agents/skills/ezclipboard-rules/SKILL.md>)
- [../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/VibeAi.md](<../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/VibeAi.md>)

Rules:

- Keep project-specific rules in `vibe/rules/`; do not copy the CodeNote master into this repository.
- Load task-specific memories from `.agents/skills/ezclipboard-rules/SKILL.md` instead of pasting every rule into the model context.
- Documentation hygiene: authoritative knowledge = correct facts only; error-memory = misconception concepts only—remove stale refs and intermediate/wrong-code history from formal docs ([../../vibe/rules/documentation.md](<documentation.md#knowledge-hygiene权威文档原则>)).
- For UI changes, read the UI guardrail memory before editing and verify search, keyboard navigation, virtual scroll, delete anchor, and input behavior.
- For storage changes, read the storage performance memory before editing and verify SQLite, JSON fallback, migration, repeat-import protection, and settings status.
- Preserve user changes and unrelated business code.
