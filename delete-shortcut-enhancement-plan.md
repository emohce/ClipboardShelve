# Delete Shortcut Enhancement Plan

## Current Behavior Analysis

### Current Delete Logic
**Location**: `src/cpns/ClipItemList.vue` lines 469-507

**Current shortcuts**:
- `Delete/Backspace`: Normal delete (skips locked items)
- `Ctrl+Delete`: Force delete (includes locked items)

**Current code**:
```javascript
const forceDelete = (ctrlKey || metaKey) && isDeleteKey
const deletableItems = itemsToDelete.filter((item) => forceDelete || item.locked !== true)
```

### Clean Dialog (清理)
**Location**: `src/views/Main.vue`
- **Trigger**: Currently triggered by UI button
- **Options**: 1h, 5h, 8h, 12h, 24h, 3d, 7d, 30d
- **Keyboard shortcuts**: Numbers 1-5 select time ranges in dialog

## Desired Changes

### 1. Change `c-del` Behavior
**Current**: `Ctrl+Delete` = Force delete (already implemented)
**Desired**: `Ctrl+Delete` = Force delete even locked items
**Status**: ✅ Already working correctly

### 2. Add `s-del` for Clean Dialog
**Current**: No shortcut for clean dialog
**Desired**: `Shift+Delete` = Open clean dialog (清理)
**Status**: ❌ Needs implementation

## Implementation Plan

### Step 1: Add Shift+Delete Detection
**File**: `src/cpns/ClipItemList.vue`
**Location**: Around line 330 (where other shortcuts are defined)

**Add new variable**:
```javascript
const isShiftDelete = shiftKey && (key === 'Delete' || key === 'Backspace')
```

### Step 2: Add Shift+Delete Handler
**File**: `src/cpns/ClipItemList.vue`
**Location**: After the existing delete handler (around line 507)

**Add new handler**:
```javascript
// Shift+Delete: 打开清理对话框
if (isShiftDelete) {
  e.preventDefault()
  e.stopPropagation()
  // Trigger clean dialog - need to communicate with parent component
  emit('openCleanDialog')
  return
}
```

### Step 3: Update Parent Component Communication
**File**: `src/cpns/ClipItemList.vue`
**Location**: In defineEmits (around line 128)

**Add new emit**:
```javascript
const emit = defineEmits([
  'onDataChange',
  'onDataRemove',
  'onMultiCopyExecute',
  'toggleMultiSelect',
  'onItemDelete',
  'openCleanDialog'  // Add this
])
```

### Step 4: Handle Emit in Parent Component
**File**: `src/views/Main.vue`
**Location**: Where ClipItemList is used

**Add handler**:
```javascript
const handleOpenCleanDialog = () => {
  clearRange.value = '1h'
  isClearDialogVisible.value = true
  focusRangeButton(clearRange.value)
}
```

**Update template**:
```vue
<ClipItemList
  @openCleanDialog="handleOpenCleanDialog"
  ...other props
/>
```

### Step 5: Update Debug Logging
**File**: `src/cpns/ClipItemList.vue`
**Location**: In DEBUG_KEYS console.log (around line 335)

**Add new variable to debug output**:
```javascript
console.log('[keyDown] 快捷键状态:', {
  isArrowUp, isArrowDown, isArrowRight, isArrowLeft, isEnter, isCtrlEnter,
  isCopy, isNumber, isShift, isSpace, isDelete, isCollect, isToggleLockHotkey,
  isShiftDelete, isCtrl
})
```

### Step 6: Update Repeat Key Handling
**File**: `src/cpns/ClipItemList.vue`
**Location**: Line 346 (repeat key early return)

**Add to condition**:
```javascript
} else if (isCopy || isEnter || isCtrlEnter || isDelete || isCollect || isToggleLockHotkey || isShiftDelete || isSpace) {
```

## Final Behavior Summary

| Shortcut | Current | Desired | Implementation |
|----------|---------|---------|----------------|
| `Delete` | Skip locked | Skip locked | ✅ Already works |
| `Ctrl+Delete` | Force delete | Force delete | ✅ Already works |
| `Shift+Delete` | Normal delete | Open clean dialog | ❌ Needs implementation |

## Code Changes Required

### 1. ClipItemList.vue
- Add `isShiftDelete` variable
- Add Shift+Delete handler
- Add `openCleanDialog` to emits
- Update debug logging
- Update repeat key handling

### 2. Main.vue
- Add `handleOpenCleanDialog` method
- Add `@openCleanDialog` to ClipItemList template

## Testing Checklist

- [ ] `Delete` still skips locked items
- [ ] `Ctrl+Delete` still force deletes locked items
- [ ] `Shift+Delete` opens clean dialog
- [ ] Clean dialog opens with default 1h range
- [ ] Clean dialog keyboard shortcuts (1-5) still work
- [ ] Clean dialog respects locked items (skips them)

## Benefits

1. **Consistent behavior**: `Ctrl+Delete` already force deletes, no change needed
2. **Easy access**: `Shift+Delete` provides quick access to clean functionality
3. **Logical grouping**: Delete key variations handle different deletion scenarios
4. **Muscle memory**: Similar to other applications that use Shift+Delete for permanent/bulk operations
