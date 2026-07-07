# Shortcut Compact Semantics Implementation

Date: 2026-06-14

## Conclusion

Shortcut storage and runtime matching now use compact semantic ids. Legacy ids are still accepted at input and migration boundaries, but persisted/default values should be compact.

2026-06-14 recheck: compact semantics is the current authoritative shortcutId model for default bindings, command overrides, SQLite shortcut rows, macro shortcut fields, and settings UI display input. The recheck also closed the fixed-key edge case where `tab` / `space` families were rejected in command record dialogs but could still pass recorder validation without a context.

2026-07-06 recheck: Windows shifted number-row and punctuation events now normalize to physical base keys, with old shifted-character ids retained as runtime/settings conflict aliases. UI display now defaults to lowercase compact ids on every platform, and modifier-only Shift preview only starts for pure Shift, not for c+s / a+s combination prefixes.

2026-07-07 follow-up: compact parser now treats `+` as a valid main key in compact ids such as `c-s-+`, rejects incomplete legacy/compact prefixes such as `Ctrl+Shift+` or `c-s-` so they cannot be silently saved as `c-s`, keeps legacy single-letter main keys such as `Ctrl+S` / `Ctrl+Shift+S` compatible, and adds a conservative Windows AltGraph fallback for printable Ctrl+Alt text events when `getModifierState('AltGraph')` is unavailable.

## Canonical Form

| Meaning | Compact id | Notes |
|---------|------------|-------|
| Ctrl / Command modifier | `c` | UI displays `c`; legacy names are accepted only at input/migration boundaries. |
| Shift modifier | `s` | Modifier segment before final key; final `s` is the character key `s`. |
| Alt / Option modifier | `a` | UI displays `a`; legacy names are accepted only at input/migration boundaries. |
| Enter / Escape | `cr` / `esc` | Avoids `Enter` text storage. |
| Delete / Backspace | `del` / `backspace` | `c-del`, `s-backspace` compose normally. |
| Arrows | `left` / `right` / `up` / `down` | Page keys use `pageup` / `pagedown`. |
| Tab / Space | `tab` / `space` | Fixed key family; not user-rebindable. |
| Pure Shift runtime event | `mod-s` | Internal only for preview-on-Shift; user recorder rejects modifier-only ids. |
| Windows shifted punctuation | physical base key | Legacy input for c+s+`/` stores as `c-s-/`, c+s+`1` as `c-s-1`; old shifted ids such as `c-s-?` and `c-s-!` remain lookup aliases. |
| Plus key | `+` / `c-s-+` | `+` is the final main key token in compact form. Legacy `Ctrl+Shift++` normalizes to `c-s-+`; incomplete `Ctrl+Shift+` is invalid. |

Implementation entry points:

- Normalization, legacy conversion, event conversion, display, fixed-key helpers: [../../../src/global/shortcutKey.js](../../../src/global/shortcutKey.js:1)
- Default command bindings are compact: [../../../src/global/hotkeyBindings.js](../../../src/global/hotkeyBindings.js:103)
- Reservation rules include Tab/Space fixed key families: [../../../src/global/shortcutReservations.js](../../../src/global/shortcutReservations.js:5)
- Legacy `layer::key:feature` overrides still migrate to `cmd:` overrides: [../../../src/global/commandKeybindings.js](../../../src/global/commandKeybindings.js:66)
- Macro shortcuts normalize on draft/model normalization: [../../../src/global/commandMacro.js](../../../src/global/commandMacro.js:19)

## Compatibility Rules

- `normalizeShortcutId()` accepts legacy input such as `ctrl+shift+Delete`, `Enter`, `ArrowLeft`, and uppercase compact input such as `C-S-DEL`, then returns lowercase compact ids.
- For legacy `+`-separated input, earlier segments are modifiers and the final segment is the main key. Therefore `Ctrl+S` normalizes to `c-s`, `Ctrl+Shift+S` normalizes to `c-s-s`, and `Ctrl+Alt+A` normalizes to `c-a-a`; full modifier-name endings such as `Ctrl+Shift` or `Ctrl+Alt` remain invalid because they have no main key.
- `compactToLegacyShortcutId()` exists only to match old override keys during migration; new writes should not use legacy ids.
- `formatShortcutDisplay()` returns lowercase compact ids, so Windows and macOS show the same label (`c-f`, `c-s-del`, `a-g`).
- For compact ids with `-`, the final segment is always the key. Therefore `c-s` means `c` modifier plus character key `s`; c+s modifier plus character key `s` is `c-s-s`.
- For the minus key, compact ids keep the trailing separator form, e.g. `c-s--` means `c` modifier + `s` modifier + minus key.
- For the plus key, compact ids use `+` as the final key token, e.g. `c-s-+`. The parser only treats `+` as a legacy separator when the first segment is a modifier alias such as `Ctrl`, `Command`, `Shift`, or `Alt`.
- Incomplete shortcut prefixes are invalid at input boundaries: `c-s-`, `C-S-`, `Ctrl+Shift`, and `Ctrl+Shift+` must not normalize to `c-s`.
- Pure modifier keyboard events use internal `mod-*` ids to prevent ordinary letter keys such as `s` from triggering Shift-only behavior. `mod-s` is emitted only for pure Shift; c+s or a+s modifier prefixes do not trigger preview-on-Shift.
- Shift preview scrolling is reserved for pure `s-up` / `s-down` / `s-left` / `s-right`; c+s+arrow shortcuts are resolved through normal compact keybinding lookup instead of preview scrolling.
- Windows uses physical base keys for shifted number-row and punctuation events (`Digit0-9`, `Minus/Equal`, brackets, slash, quote, semicolon, backslash, backquote, comma, period). Runtime lookup and settings conflict checks also include the old shifted-character aliases, so existing Windows user overrides keep working without destructive migration.
- Windows `AltGraph`, IME `Process`, `Dead`, and `Unidentified` key events are ignored by shortcut recording/dispatch to avoid treating text-composition paths as command shortcuts. If `getModifierState('AltGraph')` is unavailable, Windows Ctrl+Alt printable text is ignored only when the generated single character does not match the physical letter/number key and Shift is not held; real `c-a-q` style shortcuts remain recordable. macOS Option-generated characters keep their existing `event.key` behavior.
- `tab` and `space` are blocked by main-key token, so `tab`, `s-tab`, `c-tab`, `space`, and `c-space` are treated as fixed/non-configurable.
- Recorder-level validation rejects fixed key families even when no command context is provided. This covers macro draft shortcut validation as well as normal command record dialogs.
- Conflict handling is intentionally split: shortcut recording is a hard block, while When and macro conflict paths may still show a confirmation/preview because they change conditions rather than directly accepting a new recorded key.
- Shortcut storage defaults to SQLite-first; `userConfig.shortcutSync` is the uTools-synchronized document that stores per-device local profiles and one public profile. A device uses public only when `runtimeSourceByDevice[nativeId]` is `public`; the local SQLite profile is always preserved.

## Recheck Notes

- Current authoritative implementation files: [../../../src/global/shortcutKey.js](../../../src/global/shortcutKey.js:1), [../../../src/global/shortcutReservations.js](../../../src/global/shortcutReservations.js:1), [../../../src/global/commandKeybindings.js](../../../src/global/commandKeybindings.js:1), [../../../src/global/shortcutStore.js](../../../src/global/shortcutStore.js:1), [../../../src/storage/shortcutKeybindingRepository.js](../../../src/storage/shortcutKeybindingRepository.js:1).
- Historical docs may still mention old visible labels such as c+Enter prose or F2. Treat those as display text unless the document explicitly defines a storage `shortcutId`. Current storage/config/UI examples must use lowercase compact ids.
- Remaining manual gate: uTools production-shell first-run migration, restart persistence verification, and `shortcutSync` local/public profile data-shape verification.

## Verification

- `node test-shortcut-command-system.js` passes and covers compact normalization, legacy migration, command-level multi-key defaults, SQLite migration rows, recorder behavior, and dispatch override behavior.
- `pnpm run build` should be run after UI or dependency changes in the same closeout.
- 2026-06-14 recheck added fixed-key no-context regression coverage for `tab`, `space`, `c-tab`, and `c-space`.
