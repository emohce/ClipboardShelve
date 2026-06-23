# EzClipboard Technical Details

Tool: codex
Date: 2026-06-23

## Sync Rule

Update this file when a maintained module's entrypoint, storage/data contract, integration boundary, key workflow, or verification command changes. Keep entries as module + technology + code address.

## Module Index

| Module | Technology / Mechanism | Code Address | Current Notes | Last Verified |
| --- | --- | --- | --- | --- |
| App shell | Vue / uTools plugin runtime | [../../src/main.js](../../src/main.js:1), [../../src/App.vue](../../src/App.vue:1), [../../src/global/initPlugin.js](../../src/global/initPlugin.js:1) | Main plugin bootstrap and app mount path. | 2026-06-12 |
| Clipboard UI | Vue components/views | [../../src/views/Main.vue](../../src/views/Main.vue:1), [../../src/cpns/ClipItemList.vue](../../src/cpns/ClipItemList.vue:1), [../../src/cpns/ClipOperate.vue](../../src/cpns/ClipOperate.vue:1) | Primary clipboard list and operation UI. | 2026-06-12 |
| Storage runtime | JavaScript repositories / migration | [../../src/storage/clipboardRepository.js](../../src/storage/clipboardRepository.js:1), [../../src/storage/sqliteClipboardRepository.js](../../src/storage/sqliteClipboardRepository.js:1), [../../src/global/dbMigration.js](../../src/global/dbMigration.js:1) | Clipboard persistence, SQLite path, and migration logic. | 2026-06-12 |
| Hotkeys and macros | JavaScript command/keybinding runtime | [../../src/global/hotkeyRegistry.js](../../src/global/hotkeyRegistry.js:1), [../../src/global/keybindingResolver.js](../../src/global/keybindingResolver.js:1), [../../src/global/commandMacroRuntime.js](../../src/global/commandMacroRuntime.js:1) | Shortcut registration, conflict resolution, and command macro execution. | 2026-06-12 |
| Rich file preview | Vue / uTools preload / PDF.js / uTools Sharp / JSZip / YAML | [../../src/cpns/FileRichPreview.vue](../../src/cpns/FileRichPreview.vue:1), [../../src/utils/filePreview.mjs](../../src/utils/filePreview.mjs:1), [../../src/utils/textDocumentPreview.mjs](../../src/utils/textDocumentPreview.mjs:1), [../../src/cpns/ClipItemList.vue](../../src/cpns/ClipItemList.vue:1), [../../scripts/utools-runtime-assets.mjs](../../scripts/utools-runtime-assets.mjs:1) | PDF first page prefers uTools Sharp and falls back to PDF.js background fill; text/CSV/JSON/YAML use async head reads; `.txt`, no-extension files, and configuration-like text files use conservative content detection for JSON/YAML/CSV/AsciiDoc/Markdown; config extensions and dotfiles such as `.conf`, `.cfg`, `.properties`, `.toml`, and `.env.*` stay within text preview limits and degrade to plain text when not detected; normal text Shift preview uses the same content-level builder across tabs; DOCX/XLSX use async binary reads; PPTX/PPSX use low-fidelity text extraction; non-PDF parser results use runtime cache. | 2026-06-23 |
| Build/config | Vue CLI / npm scripts | [../../package.json](../../package.json:1), [../../vue.config.js](../../vue.config.js:1), [../../babel.config.js](../../babel.config.js:1) | Project build and transpilation config. | 2026-06-12 |
