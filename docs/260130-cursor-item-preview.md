# Baseline
- Time: 2026-01-30
- Scope: item hover/shift preview behavior in list
- Status: updated after preview fix

## 1. Original implementation summary (baseline)
- List items render previews per type; image items use a resolved image source and file items use popover thumbnails.
  - Code: src/cpns/ClipItemList.vue:L3-L101
- Image previews are rendered via a shared preview modal and `showImagePreview`.
  - Code: src/cpns/ClipItemList.vue:L119-L142, L257-L316
- Shift-hold preview dispatches `runPreviewForItem` for image, text, and file items.
  - Code: src/cpns/ClipItemList.vue:L535-L562

## 2. Cumulative changes relative to baseline
- Hovering a row with an image item now triggers preview and respects keyboard-triggered previews.
  - Code: src/cpns/ClipItemList.vue:L9-L41, L903-L914
- Image preview source normalization accepts data URLs and file paths.
  - Code: src/cpns/ClipItemList.vue:L240-L255
- Shift-hold preview opens the first image from file items when available.
  - Code: src/cpns/ClipItemList.vue:L535-L549
- Shift keydown fallback listener triggers the same 100ms preview flow when hotkey dispatch does not handle it.
  - Code: src/cpns/ClipItemList.vue:L1148-L1168

## 3. Impact and risks
- Behavior: image item preview can trigger on row hover, not only on the image element.
- Behavior: shift-hold preview includes file items with image files.
- Behavior: Shift keydown preview works even without a bound hotkey.
- Risk: external preview window may appear more frequently; ensure it remains non-intrusive.

## 4. Test checklist
- Normal flow: hover image item row shows preview; shift-hold on image item shows preview.
- Normal flow: single Shift press held >100ms triggers preview on the highlighted item.
- Edge/empty: image item with invalid data shows placeholder; file item without images does not preview.
- Permission/authorization: N/A.
- Concurrency/duplicate submission: N/A.
- Regression impact: multi-select shift range and file popover previews still work.

## 5. Non-goals
- No change to preview UI styling or layout.
- No change to clipboard capture logic or file parsing.
- No change to hotkey bindings or layers.
