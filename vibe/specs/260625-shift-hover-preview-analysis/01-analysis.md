# EzClipboard Shift Hover Preview Analysis

Tool: codex

## Scope

- Source: [src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue#L1211), [src/global/commandDefaults.js](../../../src/global/commandDefaults.js#L103), [src/global/hotkeyBindings.js](../../../src/global/hotkeyBindings.js#L372).
- Purpose: extract the reusable Shift preview state machine for EyPc MQTT list preview.

## State Machine

- `keyboardTriggeredPreview` is the Shift-hold preview source. `handleShiftKeyDown` starts a hold timer, marks keyboard preview active, then previews `showList[activeIndex]` after the hold threshold in [ClipItemList.vue](../../../src/cpns/ClipItemList.vue#L1211).
- `handleShiftKeyUp` cancels the timer and closes keyboard-triggered text/image/file preview without treating it as a normal hover close in [ClipItemList.vue](../../../src/cpns/ClipItemList.vue#L1223).
- `hoverPreviewSuspendedByKeyboard` records that keyboard navigation has taken ownership of the preview target; it is declared beside hover/keyboard preview state in [ClipItemList.vue](../../../src/cpns/ClipItemList.vue#L1589).
- `handleListMouseMove` compares actual `clientX/clientY` against the previous pointer position. Only real coordinate changes clear `hoverPreviewSuspendedByKeyboard` and click suspension in [ClipItemList.vue](../../../src/cpns/ClipItemList.vue#L1852).
- Navigation action type `hover-sync` is lower priority and does not suspend hover preview; all other navigation actions mark `hoverPreviewSuspendedByKeyboard = true` before updating `activeIndex` in [ClipItemList.vue](../../../src/cpns/ClipItemList.vue#L2036).
- The `activeIndex` watcher retriggers preview while `keyboardTriggeredPreview` is active, so `↑/↓` changes move the preview to the latest highlighted item until real mouse movement resumes hover control in [ClipItemList.vue](../../../src/cpns/ClipItemList.vue#L2189).
- `list.preview.shift` is a command, not ad hoc DOM behavior: it is defined in [commandDefaults.js](../../../src/global/commandDefaults.js#L103), bound to the main layer in [hotkeyBindings.js](../../../src/global/hotkeyBindings.js#L372), and handled by `handleListPreviewShiftCommand` in [ClipItemList.vue](../../../src/cpns/ClipItemList.vue#L2389).

## Transfer Rules

- Keep two independent preview sources: normal hover obeys hover settings; Shift preview ignores ordinary hover enablement and editor focus restrictions.
- Keep a transient hover target. When Shift is active and not keyboard-suspended, preview the hover target.
- When list highlight changes during Shift preview, suspend hover ownership and preview the highlighted target.
- Restore hover ownership only after real pointer coordinates change; synthetic or duplicate mousemove should be ignored.
- Keep target validation at the runtime/action boundary so UI state cannot preview unsupported record kinds.
