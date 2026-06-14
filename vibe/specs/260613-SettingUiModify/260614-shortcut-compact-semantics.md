# Shortcut Compact Semantics Implementation

Date: 2026-06-14

## Conclusion

Shortcut storage and runtime matching now use compact semantic ids. Legacy ids are still accepted at input and migration boundaries, but persisted/default values should be compact.

2026-06-14 recheck: compact semantics is the current authoritative shortcutId model for default bindings, command overrides, SQLite shortcut rows, macro shortcut fields, and settings UI display input. The recheck also closed the fixed-key edge case where `tab` / `space` families were rejected in command record dialogs but could still pass recorder validation without a context.

## Canonical Form

| Meaning | Compact id | Notes |
|---------|------------|-------|
| Ctrl / Command modifier | `c` | Platform display maps to Ctrl or Command. |
| Shift modifier | `s` | Modifier segment before final key. |
| Alt / Option modifier | `a` | Platform display maps to Alt or Option. |
| Enter / Escape | `cr` / `esc` | Avoids `Enter` text storage. |
| Delete / Backspace | `del` / `backspace` | `c-del`, `s-backspace` compose normally. |
| Arrows | `left` / `right` / `up` / `down` | Page keys use `pageup` / `pagedown`. |
| Tab / Space | `tab` / `space` | Fixed key family; not user-rebindable. |
| Pure Shift runtime event | `mod-s` | Internal only for preview-on-Shift; user recorder rejects modifier-only ids. |

Implementation entry points:

- Normalization, legacy conversion, event conversion, display, fixed-key helpers: [../../../src/global/shortcutKey.js](../../../src/global/shortcutKey.js:1)
- Default command bindings are compact: [../../../src/global/hotkeyBindings.js](../../../src/global/hotkeyBindings.js:103)
- Reservation rules include Tab/Space fixed key families: [../../../src/global/shortcutReservations.js](../../../src/global/shortcutReservations.js:5)
- Legacy `layer::key:feature` overrides still migrate to `cmd:` overrides: [../../../src/global/commandKeybindings.js](../../../src/global/commandKeybindings.js:66)
- Macro shortcuts normalize on draft/model normalization: [../../../src/global/commandMacro.js](../../../src/global/commandMacro.js:19)

## Compatibility Rules

- `normalizeShortcutId()` accepts legacy input such as `ctrl+shift+Delete`, `Enter`, `ArrowLeft`, and returns compact ids.
- `compactToLegacyShortcutId()` exists only to match old override keys during migration; new writes should not use legacy ids.
- For compact ids with `-`, the final segment is the key. Therefore `c-s` means Ctrl+S, while Ctrl+Shift+S is `c-s-s`.
- Pure modifier keyboard events use internal `mod-*` ids to prevent ordinary letter keys such as `s` from triggering Shift-only behavior.
- `tab` and `space` are blocked by main-key token, so `tab`, `s-tab`, `c-tab`, `space`, and `c-space` are treated as fixed/non-configurable.
- Recorder-level validation rejects fixed key families even when no command context is provided. This covers macro draft shortcut validation as well as normal command record dialogs.
- Conflict handling is intentionally split: shortcut recording is a hard block, while When and macro conflict paths may still show a confirmation/preview because they change conditions rather than directly accepting a new recorded key.
- Shortcut storage defaults to SQLite-first; `userConfig.shortcutSync` is the uTools-synchronized document that stores per-device local profiles and one public profile. A device uses public only when `runtimeSourceByDevice[nativeId]` is `public`; the local SQLite profile is always preserved.

## Recheck Notes

- Current authoritative implementation files: [../../../src/global/shortcutKey.js](../../../src/global/shortcutKey.js:1), [../../../src/global/shortcutReservations.js](../../../src/global/shortcutReservations.js:1), [../../../src/global/commandKeybindings.js](../../../src/global/commandKeybindings.js:1), [../../../src/global/shortcutStore.js](../../../src/global/shortcutStore.js:1), [../../../src/storage/shortcutKeybindingRepository.js](../../../src/storage/shortcutKeybindingRepository.js:1).
- Historical docs may still mention user-visible labels such as Ctrl+Enter or F2. Treat those as display text unless the document explicitly defines a storage `shortcutId`. Current storage/config examples must use compact ids.
- Remaining manual gate: uTools production-shell first-run migration, restart persistence verification, and `shortcutSync` local/public profile data-shape verification.

## Verification

- `node test-shortcut-command-system.js` passes and covers compact normalization, legacy migration, command-level multi-key defaults, SQLite migration rows, recorder behavior, and dispatch override behavior.
- `pnpm run build` should be run after UI or dependency changes in the same closeout.
- 2026-06-14 recheck added fixed-key no-context regression coverage for `tab`, `space`, `c-tab`, and `c-space`.
