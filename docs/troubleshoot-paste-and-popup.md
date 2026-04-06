# 问题排查：点击/Enter 无法自动粘贴到外部编辑框 & uTools 窗口自动弹出

已沉淀错误记录：[EM-2026-04-06-hideMainWindow-showMainWindow-api-race](ai-error-memory/2026-04-06-hideMainWindow-showMainWindow-api-race.md)。

## 1. 症状描述

| 编号 | 症状 | 预期行为 |
|------|------|----------|
| S1 | 列表元素点击（左键）或 Enter 后，内容**没有粘贴到外部原来的编辑框** | 应当：复制 → 隐藏 uTools 窗口 → 模拟 Ctrl+V 粘贴到之前聚焦的外部应用 |
| S2 | 操作后 **uTools 窗口自动弹出**（本应隐藏） | 应当：`utools.hideMainWindow()` 后窗口保持隐藏 |

---

## 2. 正常事件链（预期通路）

以 **Enter 键** 为例，完整的正常通路如下：

```
用户按 Enter
  → HotkeyProvider (document keydown capture)
    → dispatch(e)  [src/global/hotkeyRegistry.js#L143]
      → eventToShortcutId(e) → "Enter"
      → findBinding("main", state, "Enter")
        → 命中 { layer: "main", shortcutId: "Enter", features: ["list-enter"] }
      → 执行 feature handler "list-enter"
        [src/cpns/ClipItemList.vue#L1945-L1958]
        → copyAndPasteAndExit(item, { respectImageCopyGuard: true })
          [src/utils/index.js#L96-L128]
          → window.resetPluginUiState()  // 清空搜索、筛选等 UI 状态
          → copy(item, exit=true)
            [src/utils/index.js#L42-L58]
            → utools.copyText / copyImage / copyFile  // 写入系统剪贴板
            → utools.hideMainWindow()  // ★ 隐藏 uTools 窗口
          → paste()
            [src/utils/index.js#L60-L63]
            → utools.simulateKeyboardTap('v', 'ctrl')  // ★ 模拟 Ctrl+V
```

以 **鼠标左键点击** 为例：

```
用户左键点击列表项
  → ClipItemRow @click.left → emit('row-click-left')
    → ClipItemList handleItemClick(ev, item)
      [src/cpns/ClipItemList.vue#L1396-L1468]
      → button === 0 分支
        → copyAndPasteAndExit(item, { respectImageCopyGuard: true })
          → (同上) copy → hideMainWindow → paste → simulateKeyboardTap
```

---

## 3. 排查清单

### 3.1 【高优先级】`stopImagePreview` → `closeExternalPreview` → `focusUtoolsMainWindow` 导致窗口重新弹出

**嫌疑等级：★★★★★（最可能的根因）**

**通路分析：**

```
stopImagePreview(immediate)
  [src/cpns/ClipItemList.vue#L521-L546]
  → closeExternalPreview()
    [src/cpns/ClipItemList.vue#L808-L816]
    → externalPreviewWindow?.close()
    → focusUtoolsMainWindow()  // ★★★ 问题在这里
      [src/cpns/ClipItemList.vue#L794-L806]
      → utools.showMainWindow()  // 重新显示 uTools 窗口！
```

**问题：**
- `stopImagePreview` 在多个地方被调用：`handleWindowBlur`、`resetTransientPreviewState`、`handleShiftKeyUp`、`handleRowMouseLeave` 等。
- 每次调用都会走到 `closeExternalPreview()` → `focusUtoolsMainWindow()` → `utools.showMainWindow()`。
- 当用户点击列表项或按 Enter 时，`copyAndPasteAndExit` 调用 `utools.hideMainWindow()` 隐藏窗口。
- 但如果此时有任何预览状态（图片预览、文本预览），或者 `handleWindowBlur` 被触发（因为 `hideMainWindow` 本身会导致窗口失焦），就会触发 `stopImagePreview` → `closeExternalPreview` → `utools.showMainWindow()`，**把刚隐藏的窗口又弹出来**。

**验证方法：**
1. 在 `focusUtoolsMainWindow` 函数开头加 `console.log('[focusUtoolsMainWindow] 被调用, 调用栈:', new Error().stack)`
2. 在 `utools.hideMainWindow()` 调用前后加日志
3. 观察控制台日志中 `hideMainWindow` 和 `showMainWindow` 的调用顺序

**竞态时序：**
```
t0: 用户按 Enter
t1: copyAndPasteAndExit → copy(item, true) → utools.hideMainWindow()  ← 窗口隐藏
t2: hideMainWindow 导致 window blur 事件触发
t3: handleWindowBlur → resetTransientPreviewState → stopImagePreview(true)
t4: stopImagePreview → closeExternalPreview → focusUtoolsMainWindow
t5: utools.showMainWindow()  ← ★ 窗口又弹出来了！
t6: paste() → simulateKeyboardTap('v', 'ctrl')  ← 此时焦点已回到 uTools，粘贴目标错误
```

**修复方向（已采纳方案 A）：**
- `closeExternalPreview` 中的 `focusUtoolsMainWindow()` 仅在外部预览窗口**确实存在且被关闭**后调用；若本就没有外部窗口，只清空引用，不聚焦主窗口。
- 备选：在 `copyAndPasteAndExit` 的退出流程中设置 `isExiting` 等标志位，使 `focusUtoolsMainWindow` 在退出中不执行（当前未实现）。

---

### 3.2 【高优先级】`handleWindowBlur` 在 `hideMainWindow` 后被触发，干扰粘贴流程

**嫌疑等级：★★★★☆**

**通路分析：**

```javascript
// src/cpns/ClipItemList.vue handleWindowBlur
const handleWindowBlur = () => {
    resetTransientPreviewState();  // 内联将 keyboardTriggeredPreview 置 false，再 stopImagePreview(true) → closeExternalPreview
    stopAutoScroll();
    if (shiftKeyTimer) { ... }
    if (keyboardTriggeredPreview.value) {
        // resetTransientPreviewState 已把 keyboardTriggeredPreview 置为 false，该分支当前顺序下不可达（冗余代码）。
        stopImagePreview(true);
        hideTextPreview();
    }
};
```

- `window.addEventListener("blur", handleWindowBlur)` 在 [`ClipItemList.vue`](src/cpns/ClipItemList.vue) 的 `onMounted` 中注册。
- `utools.hideMainWindow()` 会导致窗口失焦，触发 `blur` 事件。
- `handleWindowBlur` → `resetTransientPreviewState` → `stopImagePreview(true)` → `closeExternalPreview`。**修复前**：`closeExternalPreview` 末尾无条件 `focusUtoolsMainWindow` → `utools.showMainWindow()`。**修复后**（方案 A 已落地）：仅在实际关闭仍存在的外部预览窗口后调用 `focusUtoolsMainWindow`；无外部预览时不应再误弹主窗口。

**验证方法：**
1. 在 `handleWindowBlur` 开头加 `console.log('[handleWindowBlur] 触发')`
2. 临时注释掉 `handleWindowBlur` 中的 `resetTransientPreviewState()` 调用，看问题是否消失

---

### 3.3 【中优先级】`list-shift` feature 绑定存在但未注册 handler

**嫌疑等级：★★★☆☆**

**发现：**
- [src/global/hotkeyBindings.js#L284](src/global/hotkeyBindings.js#L284) 中有绑定：
  ```javascript
  { layer: "main", shortcutId: "Shift", features: ["list-shift"] }
  ```
- 但全仓库搜索 `registerFeature("list-shift"` **没有任何结果**。
- `dispatch` 在找到 binding 后会遍历 features，如果 handler 不存在，`features.get("list-shift")` 返回 `undefined`，handler 不会执行，`result` 为 `undefined`（null 分支），继续下一个 feature。
- 由于 `"list-shift"` 是该 binding 的唯一 feature，最终 `handled = false`，不会 `preventDefault`。
- 这本身不会直接导致问题，但说明 Shift 键的 hotkey 分发链可能不完整。

---

### 3.4 【已修复】`stopKeyHold` 在 `onUnmounted` 中被调用但未定义

**嫌疑等级：★★★☆☆（历史）**

**原问题：**
- [`ClipItemList.vue`](src/cpns/ClipItemList.vue) 中较早注册的 `onUnmounted` 曾调用 `stopKeyHold()`，但 `src/` 内无定义，卸载时可能抛出 `ReferenceError: stopKeyHold is not defined`。

**修复：**
- 已移除无效调用。`shiftKeyTimer` 等由较晚的 `onUnmounted` 末尾 `resetTransientPreviewState()` 一并清理。

**验证方法：**
1. 打开 DevTools Console，切换页面或关闭插件，确认无 `stopKeyHold` 相关 `ReferenceError`

---

### 3.5 【中优先级】`resetPluginUiState` 在 `copy` 之前执行，可能导致 DOM 变化干扰焦点

**嫌疑等级：★★☆☆☆**

**通路分析：**

```javascript
// src/utils/index.js#L96-L128
const copyAndPasteAndExit = (item, options = {}) => {
  // ...
  if (exit && typeof window.resetPluginUiState === 'function') {
    window.resetPluginUiState()  // ← 先重置 UI（清空搜索、收起面板）
  }
  copy(item, exit)  // ← 再复制 + hideMainWindow
  paste()            // ← 最后模拟粘贴
}
```

```javascript
// src/views/Main.vue#L340-L346
const resetPluginUiState = () => {
    clearSearchRevealKeyGuard();
    filterText.value = "";        // 清空搜索文本
    lockFilter.value = "all";
    isSearchPanelExpand.value = false;  // 收起搜索面板
    nextTick(() => document.activeElement?.blur?.());  // ← blur 当前焦点
};
```

- `resetPluginUiState` 中的 `nextTick(() => document.activeElement?.blur?.())` 会在微任务中 blur 当前焦点。
- 这个 blur 可能与 `hideMainWindow` 产生竞态。

---

### 3.6 【低优先级】`handleItemClick` 中左键点击后的 `nextTick` 移动高亮

**嫌疑等级：★★☆☆☆**

```javascript
// src/cpns/ClipItemList.vue#L1435-L1453
if (button === 0) {
    copyAndPasteAndExit(item, { respectImageCopyGuard: true });
    // 复制后移动到下一个item
    nextTick(() => {
        const nextIndex = Math.min(currentIndex + 1, props.showList.length - 1);
        if (nextIndex !== currentIndex) {
            setKeyboardActiveIndex(nextIndex, { block: "center" });
        }
    });
}
```

- `copyAndPasteAndExit` 已经调用了 `hideMainWindow`，窗口应该已经隐藏。
- 但 `nextTick` 中的 `setKeyboardActiveIndex` 会触发 DOM 操作（滚动等），可能在窗口隐藏后仍然执行，产生副作用。

---

## 4. 对比 ClipboardManager 的做法

典型的 uTools 剪贴板管理插件（如 ClipboardManager）的粘贴流程：

```
1. 用户选择条目（点击/Enter）
2. 写入系统剪贴板（utools.copyText / copyImage / copyFile）
3. 隐藏 uTools 窗口（utools.hideMainWindow()）
4. 短暂延迟（确保窗口完全隐藏、焦点回到原应用）
5. 模拟按键粘贴（utools.simulateKeyboardTap('v', 'ctrl')）
```

**关键差异：**
- ClipboardManager 在 `hideMainWindow` 和 `simulateKeyboardTap` 之间**没有任何可能重新显示窗口的逻辑**。
- （修复前）EzClipboard 的 `closeExternalPreview` 在**无外部预览时仍调用** `focusUtoolsMainWindow`，从而 `utools.showMainWindow()` 打破了这个前提；方案 A 已消除该无条件调用。

---

## 5. 推荐修复优先级

| 优先级 | 排查项 | 修复方向 | 风险 |
|--------|--------|----------|------|
| P0 | 3.1 `closeExternalPreview` 无条件调用 `focusUtoolsMainWindow` | 方案 A 已落地：仅在实际关闭外部预览后 `focusUtoolsMainWindow` | 低 |
| P0 | 3.2 `handleWindowBlur` 链接触发 `closeExternalPreview` | 主因由 3.1 修复；若仍有边缘竞态再考虑退出标志位（方案 B） | 低 |
| P1 | 3.4 `stopKeyHold` 未定义 | **已修复**：删除无效调用 | 极低 |
| P1 | 3.3 `list-shift` 未注册 handler | 补充 `registerFeature("list-shift", ...)` 或移除绑定 | 极低 |
| P2 | 3.5 `resetPluginUiState` 中的 `nextTick blur` 竞态 | 改为同步 blur 或移除 | 低 |
| P2 | 3.6 点击后 `nextTick` 移动高亮 | 在 `exit=true` 时跳过后续高亮移动 | 低 |

---

## 6. 快速验证脚本

在 uTools 插件的 DevTools Console 中执行以下代码，可以快速确认根因：

```javascript
// 1. 监控 showMainWindow 调用
const _show = utools.showMainWindow;
utools.showMainWindow = function(...args) {
  console.warn('[TRACE] utools.showMainWindow 被调用!', new Error().stack);
  return _show?.apply(this, args);
};

// 2. 监控 hideMainWindow 调用
const _hide = utools.hideMainWindow;
utools.hideMainWindow = function(...args) {
  console.warn('[TRACE] utools.hideMainWindow 被调用!', new Error().stack);
  return _hide?.apply(this, args);
};

// 3. 监控 simulateKeyboardTap 调用
const _tap = utools.simulateKeyboardTap;
utools.simulateKeyboardTap = function(...args) {
  console.warn('[TRACE] utools.simulateKeyboardTap 被调用!', args, new Error().stack);
  return _tap?.apply(this, args);
};
```

执行后点击列表项或按 Enter，观察 Console 中的调用顺序。如果看到：
```
[TRACE] utools.hideMainWindow 被调用!
[TRACE] utools.showMainWindow 被调用!   ← 这就是问题
[TRACE] utools.simulateKeyboardTap 被调用!
```
则确认（修复前）为 `hideMainWindow` 后经由 `blur` → `closeExternalPreview` 误触发 `showMainWindow` 的竞态。**方案 A 落地后**，无外部预览时不应再出现上述 `showMainWindow` 追踪行。

---

## 7. 最小修复方案（草案）

**落地说明：** 方案 A 已按下文实现于 [`src/cpns/ClipItemList.vue`](src/cpns/ClipItemList.vue) 的 `closeExternalPreview`；方案 B 未采用，留作备选。

### 方案 A：`closeExternalPreview` 守卫

```javascript
// src/cpns/ClipItemList.vue - closeExternalPreview
const closeExternalPreview = () => {
    if (externalPreviewWindow && !externalPreviewWindow.closed) {
        try {
            externalPreviewWindow.close();
        } catch (e) {}
        externalPreviewWindow = null;
        focusUtoolsMainWindow(); // 仅在确实关闭了外部窗口时才聚焦回来
    } else {
        externalPreviewWindow = null;
        // ★ 不调用 focusUtoolsMainWindow()
    }
};
```

### 方案 B：退出标志位

```javascript
// src/utils/index.js 或 window 上设置标志
let isExitingPlugin = false;

const copyAndPasteAndExit = (item, options = {}) => {
  // ...
  if (exit) {
    isExitingPlugin = true;
    setTimeout(() => { isExitingPlugin = false; }, 500);
  }
  // ...
};

// src/cpns/ClipItemList.vue - focusUtoolsMainWindow
const focusUtoolsMainWindow = () => {
    if (window.__isExitingPlugin) return; // 退出流程中不重新显示窗口
    // ... 原逻辑
};

// src/cpns/ClipItemList.vue - handleWindowBlur
const handleWindowBlur = () => {
    if (window.__isExitingPlugin) return; // 退出流程中不处理 blur
    // ... 原逻辑
};
```

---

## 8. 关联文件清单

| 文件 | 关键行 | 角色 |
|------|--------|------|
| [src/utils/index.js](src/utils/index.js) | L42-L63, L96-L128 | `copy`, `paste`, `copyAndPasteAndExit` 核心粘贴逻辑 |
| [src/cpns/ClipItemList.vue](src/cpns/ClipItemList.vue) | L794-L816, L1396-L1468, L1945-L1958, L2319-L2333, L2335-L2377 | 点击/Enter handler、预览清理、blur handler |
| [src/cpns/HotkeyProvider.vue](src/cpns/HotkeyProvider.vue) | L10-L11 | 全局 keydown 捕获 → dispatch |
| [src/global/hotkeyRegistry.js](src/global/hotkeyRegistry.js) | L143-L238 | 热键分发核心 |
| [src/global/hotkeyBindings.js](src/global/hotkeyBindings.js) | L260, L284 | Enter / Shift 绑定配置 |
| [src/views/Main.vue](src/views/Main.vue) | L340-L346, L1142 | `resetPluginUiState` 定义与挂载 |
| [src/global/initPlugin.js](src/global/initPlugin.js) | L1283-L1323 | `onPluginEnter` 窗口焦点管理 |
| [public/preload.js](public/preload.js) | L1-L28 | Node 模块暴露（clipboard, utools 等） |
