# 快捷键与功能多系统核验

**基线**: 2026-01-30，当前仓库代码与配置。  
**范围**: 快捷键/功能是否支持多系统（Win/macOS/Linux）、是否存在冲突或问题。  
**非本次范围**: 与 uTools 宿主全局快捷键的优先级、用户自定义改键方案未实现。

---

## 1. 多系统支持现状

### 1.1 平台声明与剪贴板监听

| 项       | 位置                                    | 说明                                                                                                                                                                                           |
| -------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 平台声明 | `public/plugin.json` 第 12 行           | `"platform": ["win32", "darwin", "linux"]`，三端均声明支持。                                                                                                                                   |
| 监听程序 | `public/listener.js` 第 14–22、31–40 行 | 按 `process.platform` 选择可执行文件：`win32` → `.exe`，`darwin` → `clipboard-event-handler-mac`，`linux` → `clipboard-event-handler-linux`；非 Windows 会 `chmodSync(target, 0o755)` 后启动。 |
| 监听路径 | 同上                                    | 监听程序路径由 `dbPath` 推导（`dbPath` 中 `_utools_clipboard_manager_storage` 之前一段 + 平台对应文件名），需保证各平台对应二进制与 db 同目录或约定路径。                                      |

结论：剪贴板监听在 Win/macOS/Linux 上均有分支，逻辑正确；需确保各平台提供对应可执行文件（如 `docs/` 下仅有 win32 exe，darwin/linux 需用户按文档安装）。

### 1.2 粘贴模拟与路径

| 项           | 位置                                     | 说明                                                                           |
| ------------ | ---------------------------------------- | ------------------------------------------------------------------------------ |
| 粘贴模拟     | `src/utils/index.js` 第 57–59 行         | `utools.isMacOs()` 为真时用 `command`，否则用 `ctrl`，与系统习惯一致。         |
| 默认存储路径 | `src/global/restoreSetting.js` 第 5–7 行 | macOS 用 `userData`，否则用 `home`，再拼 `_utools_clipboard_manager_storage`。 |
| 换行符       | `src/views/Main.vue` 第 252 行           | 根据 `navigator.userAgent.includes('Windows')` 用 `\r\n` 或 `\n`。             |

结论：粘贴、路径、换行均做了平台区分，行为合理。

### 1.3 快捷键修饰键：Ctrl 与 Meta（Cmd）未统一

| 项         | 位置                                    | 说明                                                                                                                       |
| ---------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 事件解析   | `src/global/shortcutKey.js` 第 17–27 行 | `eventToShortcutId(e)` 会分别输出 `ctrl` 与 `meta`（如 Cmd+C → `meta+c`）。                                                |
| 绑定配置   | `src/global/hotkeyBindings.js` 全文     | 所有带修饰键的快捷键均只配置了 **ctrl**（如 `ctrl+c`、`ctrl+f`、`ctrl+1`～`ctrl+9` 等），**没有任何 meta 或 Cmd 的绑定**。 |
| 设置页文案 | `src/views/Setting.vue` 第 89、93 行    | 文案写的是「Ctrl/Cmd + D」「Ctrl/Cmd + U」，暗示 Mac 可用 Cmd，但实际绑定只有 ctrl。                                       |

结论（重要）：

- **Windows / Linux**：Ctrl+键 与绑定一致，快捷键正常。
- **macOS**：用户习惯用 **Cmd+键**（如 Cmd+C 复制、Cmd+F 搜索）。当前绑定仅有 **Ctrl+键**，因此：
  - 按 **Cmd+C** / **Cmd+F** 等不会触发插件的「复制」「聚焦搜索」等（事件为 `meta+c` / `meta+f`，绑定表无对应项）。
  - 只有按 **Ctrl+C** / **Ctrl+F** 等才会触发。
- 即：**功能上支持多系统，但 macOS 上快捷键不符合常见习惯**，需用户改用 Ctrl，或在代码中增加「主修饰键」映射（见下文建议）。

---

## 2. 快捷键与功能清单（与多系统/冲突相关）

以下仅列与平台或冲突相关的点，完整绑定见 `src/global/hotkeyBindings.js`。

### 2.1 仅 Ctrl、无 Meta 的绑定（影响 macOS 习惯）

- 主层：`ctrl+f` 聚焦搜索，`ctrl+c` 复制，`ctrl+d` 收藏，`ctrl+u` 锁定，`ctrl+Enter` 复制并锁定，`ctrl+Delete`/`ctrl+Backspace` 强制删除，`ctrl+1`～`ctrl+9` 快速复制，`ctrl+shift+1`～`9` 抽屉子项，`ctrl+k`/`ctrl+j` 上下移动。
- 搜索状态：`ctrl+Delete`/`ctrl+Backspace` 删除，`ctrl+shift+Delete` 强制删除。
- 抽屉层：`ctrl+1`～`ctrl+9` 选择。
- 清除弹窗：无 ctrl/meta，数字/Enter/Tab 等，各平台一致。

### 2.2 Alt 键（alt+1～9）

- 绑定：`main` 层 `alt+1`～`alt+9` 切换 Tab。
- 多系统：Alt 在 macOS 上多为 Option，键位存在，一般能正常触发；少数输入法或系统可能占用 alt+数字，属环境冲突，非代码错误。

### 2.3 无修饰键或 Shift

- Enter、Escape、Tab、Shift+Tab、方向键、Delete、Backspace、Space、Shift（长按预览）等：不依赖 ctrl/meta，三端一致。

---

## 3. 内部冲突与优先级

### 3.1 同组合键不同 layer/state

- **ctrl+Delete / ctrl+Backspace**  
  - `main` 层无 state：`list-force-delete`。  
  - `main` 层 state=search：`search-delete-normal`。  
  由 `hotkeyRegistry.js` 的 layer + state 决定，先匹配当前层再匹配 main，无逻辑冲突。
- **ctrl+1～9**  
  - `main`：快速复制 1～9。  
  - `clip-drawer`：抽屉选择 1～9。  
  抽屉打开时 `clip-drawer` 为当前层，优先于 main，行为符合预期。

### 3.2 同一 layer 内

- 每个 (layer, state, shortcutId) 仅对应一组 features，无同层同键多义。

结论：当前绑定在「层 + 状态 + 快捷键」维度无内部冲突。

---

## 4. 与宿主 / 环境的潜在冲突

- **uTools 宿主**：若 uTools 或其它插件注册了相同组合键（如 ctrl+f、alt+1），谁先捕获取决于 uTools 的注册顺序与策略，本项目未做检测或说明。文档 `docs/260129-cursor-hotkey-verify.md` 已注明「热键冲突、与 uTools 宿主快捷键的优先级未在本文档核验」。
- **输入框焦点**：`Main.vue` 约 722–725 行对「单字符且无 ctrl/meta/alt」的按键做 `window.focus()`，避免在输入框内误吃快捷键；带修饰键的由 HotkeyProvider 在 capture 阶段处理（`keydownHandler` 使用 `true`），逻辑合理。
- **重复按键**：`hotkeyRegistry.js` 中 `ignoreRepeat === true` 时忽略 `e.repeat`，避免长按重复触发。

---

## 5. 问题与建议汇总

| 类型             | 描述                                                          | 建议                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| macOS 快捷键习惯 | 绑定仅 ctrl，无 meta；Mac 用户常用 Cmd，导致 Cmd+C/F 等不生效 | **已采用方案 B**：在 `hotkeyRegistry.js` 的 dispatch 中，Mac 上把用于查找的 shortcutId 里的 `meta` 归一为 `ctrl`（`shortcutIdForLookup`），与现有 ctrl 绑定同根，Cmd+键 即可生效。 |
| 设置页文案       | 写的是 Ctrl/Cmd，实际只有 Ctrl                                | 已实现 Cmd 同根，保持「Ctrl/Cmd」文案即可，与行为一致。                                                                                                                            |
| 剪贴板监听二进制 | 仅见 win32 exe，darwin/linux 需单独提供                       | 保持现有 `listener.js` 逻辑，在文档/发布说明中明确各平台所需文件名与安装方式（如 notify 中已提示 macOS 安装 clipboard-event-handler）。                                            |
| 宿主快捷键       | 未核验与 uTools 的优先级                                      | 建议在用户文档或 260129 中单独一节说明「可能与 uTools 或其它插件快捷键冲突，可尝试在 uTools 设置中调整」。                                                                         |

---

## 6. 测试建议（多系统）

- **Windows**：重点验证 ctrl+* 全部生效；剪贴板监听使用 `clipboard-event-handler-win32.exe`。
- **macOS**：验证 Ctrl+* 生效、Cmd+* 当前不生效（与上文结论一致）；粘贴模拟为 Cmd+V；剪贴板监听使用 `clipboard-event-handler-mac`。
- **Linux**：验证 ctrl+* 与 Win 一致；剪贴板监听使用 `clipboard-event-handler-linux`，权限 0o755。

完成上述核验后，可认为「当前项目快捷键与功能在多系统下的支持与冲突」已按本文档完成排查；若后续增加 Cmd 支持或改键，需同步更新绑定与设置页文案并回归上述场景。

---

## 7. 变更记录（相对基线）

- **方案 B 实现（Mac/Win Ctrl 同根）**  
  - 文件：`src/global/hotkeyRegistry.js`  
  - 新增 `isMac()`：优先 `window.exports?.utools?.isMacOs?.()`，否则 `navigator.platform` 判 Mac。  
  - 新增 `shortcutIdForLookup(shortcutId)`：仅在 Mac 下将 shortcutId 中 `meta` 替换为 `ctrl`，用于查找；绑定表不变，仍为 ctrl。  
  - `dispatch(e)` 中：`shortcutId = eventToShortcutId(e)`，`lookupId = shortcutIdForLookup(shortcutId)`，`findBinding(..., lookupId)`。  
  - 效果：Mac 上按 Cmd+C / Cmd+F 等会得到 `meta+c` / `meta+f`，查找时变为 `ctrl+c` / `ctrl+f`，命中现有绑定，与 Win 上 Ctrl 行为一致。
