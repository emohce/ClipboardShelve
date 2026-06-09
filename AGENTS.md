# EzClipboard AI Adapter

Tool: codex

Read first:
- [../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/VibeAi.md](../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/VibeAi.md)
- [vibe/rules/README.md](vibe/rules/README.md)
- [vibe/rules/context-loading.md](vibe/rules/context-loading.md)
- [.agents/skills/ezclipboard-rules/SKILL.md](.agents/skills/ezclipboard-rules/SKILL.md)

Hard constraints:
- Keep project-specific rules in `vibe/rules/`; do not copy the CodeNote master into this repository.
- Preserve existing behavior and user changes; do not touch unrelated business code.
- High-risk actions require confirmation: DB writes, deletes, production changes, credentials, publish/deploy, or external service writes.
- Write Markdown links relative to the target document location.
- Cursor, Codex, Windsurf, and other AI tools must use adapter files only as routing surfaces; authoritative project rules stay in `vibe/rules/`, and cross-project rules stay in CodeNote.
- Load task-specific memories through `.agents/skills/ezclipboard-rules/SKILL.md` instead of pasting all rules into every prompt.
- Final replies must include verification status and memory/process-document status.
