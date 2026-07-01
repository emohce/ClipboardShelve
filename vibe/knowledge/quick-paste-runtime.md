# Quick Paste Runtime（置顶粘贴 / 组合循环粘贴）

Tool: codex

## 范围

| code | 用户可见名称 | 行为 |
|------|-------------|------|
| `quick-paste-top` | 粘贴置顶项 | 按 `pin.lastActiveContext` 取**单项置顶**最上方可粘贴条目 |
| `quick-paste-pin-group` | 循环粘贴组合项 | 按 `pin.group` cursor 循环粘贴组合内下一项 |

与列表内点击/Enter **分流**：静默入口走原生 `hideMainWindowPaste*`；列表内仍走 `copy + hideMainWindow + simulateKeyboardTap`。

## 代码落点

| 模块 | 路径 | 职责 |
|------|------|------|
| 运行时 | [src/global/quickPasteRuntime.js](../../src/global/quickPasteRuntime.js) | 选择条目、粘贴、组合 cache、串行保护 |
| 进入复用 | [src/global/pluginEnterHandlers.js](../../src/global/pluginEnterHandlers.js) | `onPluginEnter` 多路复用 + pending |
| 选择工具 | [src/global/quickPasteSelection.js](../../src/global/quickPasteSelection.js) | 置顶/组合 cursor、cache |
| 粘贴执行 | [src/utils/index.js](../../src/utils/index.js) | `copyAndPasteAndExit` + `tryHideMainWindowPasteItem` |
| 冷启动 | [src/main.js](../../src/main.js) | multiplexer → `initPlugin` → `mount` → `flushPendingQuickPasteActions` |
| 组合 cache | [src/views/Main.vue](../../src/views/Main.vue) | `syncQuickPastePinGroupCache` |
| 指令注册 | [scripts/utools-runtime-assets.mjs](../../scripts/utools-runtime-assets.mjs) | `mainHide: true` |

## 粘贴执行

**静默快捷粘贴**（[uTools 输入 API](https://www.u-tools.cn/docs/developer/api-reference/utools/input.html)）：

- `hideMainWindowPasteText` / `PasteImage` / `PasteFile`
- 经 `copyAndPasteAndExit(item, { useHideMainWindowPaste: true, skipResetPluginUiState: true, markExitingPlugin: true })`

**列表内粘贴**：`copyText/copyImage/copyFile` → `hideMainWindow` → `simulateKeyboardTap`。

**宏命令步骤间** `macroSettleAfterMs`（[commandDefaults.js](../../src/global/commandDefaults.js)）仅用于多步宏，与静默快捷粘贴无关。

**Win 全局快捷键**：`action.from === 'hotkey'` 且 `utools.isMacOs() === false` 时延迟 `QUICK_PASTE_HOTKEY_SETTLE_MS`（120ms）后单次粘贴；点击和 Mac/non-Windows hotkey 仍同步走原快路径。hotkey 串行队列，消费只推进组合 cursor，**不清空**置顶/组合运行时 cache。

**Win hotkey 文本**：仅用 `hideMainWindowTypeString`（不模拟 Ctrl+V，避免只出 `v`）。点击与其它平台仍用 `hideMainWindowPasteText`。图片/文件用 `hideMainWindowPaste*`。

**全局 cache**：`setQuickPasteTopCache` / `setQuickPastePinGroupCache` 在 Main 同步；热路径优先读内存 snapshot，db 暂不可用时仍可用已缓存条目。

**静默 fallback 禁止**：`hideMainWindowPaste*` 不可用时不得回退到 `simulateKeyboardTap`（避免外部只出现 `v`）；见 [EM-2026-06-13](error-memory/2026-06-13-quick-paste-simulateKeyboardTap-only-v.md)。

## 冷启动

1. `installPluginEnterMultiplexer()` 在 `initPlugin` 之前。
2. 冷启动期间 `quick-paste-*` 进 pending 队列。
3. `app.mount()` 后 `flushPendingQuickPasteActions()`。
4. 热启动由 `registerQuickPasteRuntime` 同步处理。

## 产品语义

- `quick-paste-top`：只取符合 last context 的单项置顶；**不** fallback 组合项、当前剪贴板临时项或列表首项。
- `quick-paste-pin-group`：只读 `pin.group` 与运行时 cache；与置顶项独立。
- 无匹配：`hideMainWindow()`，不粘贴。

## 组合 cache

[quick-paste-pin-group-cache.md](quick-paste-pin-group-cache.md)。冷启动 cache 未建立时允许 id 解析兜底。

## 实现注意

- `composeQuickPasteTopItems` 仅 UI 列表展示，不参与静默 `quick-paste-top` 选择。
- `itemMatchesContext` 在 Main 与 runtime 各有一份（上下文默认值不同），后续可抽到 `quickPasteSelection.js`。
- 粘贴退出时 `__isExitingPlugin` 防止 blur 链误弹窗（见 EM-2026-04-06）。

## 误区（勿再试）

见 [error-memory/](error-memory/README.md)（概念级误区，非排查流水账）。文档整理原则见 [../rules/documentation.md](../rules/documentation.md#knowledge-hygiene权威文档原则)。

## 验证

- `node test-shortcut-command-system.js`
- `pnpm run build`
- uTools：全局快捷键「粘贴置顶项」「循环粘贴组合项」；列表点击/Enter 回归
