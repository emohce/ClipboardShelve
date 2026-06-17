# EzClipboard AI Rules

Tool: codex

## Read First

- CodeNote master: [../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/VibeAi.md](../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/VibeAi.md)
- CodeNote rule index: [../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/README.md](../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/README.md)
- Project developer soul: [../knowledge/developer-soul.md](../knowledge/developer-soul.md)
- Project rules: [project.md](project.md)
- Workflow rules: [workflow.md](workflow.md)
- Knowledge routing: [knowledge.md](knowledge.md)
- Context loading and tool adapters: [context-loading.md](context-loading.md)
- Documentation routing: [documentation.md](documentation.md)

## Rule Boundary

- CodeNote stores cross-project AI collaboration rules.
- This project stores only project-specific stack, commands, paths, business rules, risk areas, and verification notes.
- Legacy AI rules are preserved under `vibe/knowledge/legacy/` when replaced by this structure.
- Tool-specific adapters are discovery surfaces only; the authoritative rule tree remains this directory plus CodeNote.
- Documentation layering is defined in [documentation.md](documentation.md); keep task details in `vibe/specs/` instead of adapters.
- For medium or larger architecture, UI, interaction, configuration, storage, performance, and AI-rule tasks, read [../knowledge/developer-soul.md](../knowledge/developer-soul.md) before proposing changes.
- Knowledge hygiene: see [documentation.md#Knowledge-Hygiene](documentation.md#knowledge-hygiene权威文档原则).

## Task Closeout

Every AI task must report:

- Verification performed or skipped with reason.
- Memory routing: none, project memory, error archive, ADR, DB memory, or needs user confirmation.
- Process document status: not needed, created, updated, compacted, or archived.
