# AI Rules Migration Eval

Tool: codex

Project: `EzClipboard`
Wave: `wave1`
Date: 2026-06-06

## Migration Summary

- Applied CodeNote master-rule adapter structure.
- Created or updated `AGENTS.md` and project `vibe/rules/` entries.
- Preserved pre-migration adapter content under `vibe/knowledge/legacy/adapters/` when an adapter already existed.
- DB workspace created: no.

## Verification

### Audit With Link Fix

```text
AI rule audit: OK
```

### Final Project Audit

```text
AI rule audit: OK
```

### Current Git Status Snapshot

```text
M .run/zzBuild.run.xml
 M AGENTS.md
 M "docs/todo/26-oldDone/260126-cursor-utools\346\265\213\350\257\225\351\252\214\350\257\201\346\214\207\345\215\227.md"
?? Folder.DotSettings.user
?? vibe/rules/README.md
?? vibe/evals/README.md
?? vibe/evals/README.md
?? vibe/evals/
?? vibe/knowledge/
?? vibe/rules/
?? vibe/scripts/
```

## Remaining Notes

- Default project audit checks AI rule surfaces only. Use `--all-markdown` for broad historical-doc hygiene scans.
- Existing user dirty worktree entries were not reverted.
- Unresolved AI-rule audit issues: none.

## Memory Routing

- Project memory: updated AI rule structure.
- Error archive: not needed.
- ADR: not needed.
- DB memory: not needed.
