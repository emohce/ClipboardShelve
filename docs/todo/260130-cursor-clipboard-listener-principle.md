# 剪贴板监听程序原理与监听方式

**基线**: 2026-01-30，当前仓库实现。  
**范围**: 监听程序在项目中的角色、与插件侧的协作方式、常见 OS 层实现原理说明。

---

## 1. 整体架构（本项目中是谁在监听）

本插件使用**两种**剪贴板感知方式，优先用**外部监听程序**，不可用时降级为**轮询**。

```
┌─────────────────────────────────────────────────────────────────┐
│  uTools / Electron 插件进程                                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  public/listener.js (ClipboardEventListener)                 │ │
│  │  - startListening(dbPath) → 启动子进程 clipboard-event-*    │ │
│  │  - 监听子进程 stdout，收到 "CLIPBOARD_CHANGE" 时 emit('change')│ │
│  └───────────────────────────┬───────────────────────────────────┘ │
│                              │ stdout 一行 "CLIPBOARD_CHANGE"      │
│  ┌───────────────────────────▼───────────────────────────────────┐ │
│  │  子进程：clipboard-event-handler-win32.exe / darwin / linux   │ │
│  │  （独立可执行文件，非本仓库源码；负责对接系统剪贴板 API）       │ │
│  │  - 调用系统剪贴板监听 API                                      │ │
│  │  - 一旦检测到系统剪贴板变化 → 向 stdout 打印 CLIPBOARD_CHANGE  │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

- **谁在“监听”**：真正在“盯系统剪贴板”的是**子进程**（`clipboard-event-handler-*`）。  
- **插件在做什么**：启动子进程、读其 stdout、收到 `CLIPBOARD_CHANGE` 后触发 `change`，再用 Electron 的 clipboard API 读当前内容并写入数据库。

---

## 2. 插件侧实现（本仓库）

### 2.1 启动与通信（`public/listener.js`）

- **启动**：根据 `process.platform` 选择可执行文件（win32 → `.exe`，darwin/linux → 无后缀），路径由数据库路径推导：`dbPath` 中 `_utools_clipboard_manager_storage` 之前的目录 + 对应文件名。
- **执行**：`child_process.execFile(target)` 启动子进程，不传参数；darwin/linux 会先 `chmodSync(target, 0o755)`。
- **通信**：仅通过**标准输出**。子进程每检测到一次系统剪贴板变化，就向 stdout 写一行 `CLIPBOARD_CHANGE`（无参数、无 JSON，就这一行字符串）。
- **事件**：监听 `child.stdout.on('data')`，若 `data.toString().trim() === 'CLIPBOARD_CHANGE'` 则 `this.emit('change')`。此外对子进程的 `close`、`exit`、`error` 做转发。

### 2.2 收到“变化”后做什么（`src/global/initPlugin.js`）

- **注册**：`registerClipEvent(listener)` 里对 `listener.on('change', ...)` 绑定回调。
- **回调逻辑**：触发 `handleClipboardChange()`。
  - **取当前内容**：`pbpaste()` 使用 Electron 的 `clipboard.readText()`、`clipboard.readImage()`、`clipboard.readFile()` 等读取当前剪贴板（文本 / 图片 / 文件）。
  - **入库**：根据内容算 id（如 MD5），若已存在则 `db.updateItemViaId` 更新，否则 `db.addItem` 新增。

也就是说：**“何时变”由子进程用系统 API 感知并通知；“变的是什么”由插件用 Electron clipboard API 再读一次并写入 DB。**

### 2.3 降级：轮询模式（`addCommonListener`）

- 当子进程**不存在**、**启动失败**或**异常退出**时，会调用 `addCommonListener()`。
- 轮询：每 **300ms** 调用一次 `pbpaste()` 得到当前剪贴板内容，与上一份比较（如 id）；若不同则视为变化，同样走 `handleClipboardChange(item)`。
- 不依赖任何外部可执行文件，只依赖 Electron 的 clipboard 读取，因此可跨平台降级。

---

## 3. 子进程（监听程序）在系统层一般怎么做

本仓库**不包含** `clipboard-event-handler-*` 的源码，只约定其行为：**检测到系统剪贴板变化时向 stdout 打印一行 `CLIPBOARD_CHANGE`**。下面是对各平台常见实现方式的说明，便于理解“监听”的本质。

### 3.1 Windows（win32）

- **常用 API**：`AddClipboardFormatListener(HWND)` 注册一个窗口，系统在剪贴板内容变化时向该窗口发 **WM_CLIPBOARDUPDATE**（0x031D）。
- **流程**：创建隐藏窗口 → 消息循环 → `AddClipboardFormatListener(hwnd)` → 在 WndProc 里处理 WM_CLIPBOARDUPDATE → 收到后向 stdout 写 `CLIPBOARD_CHANGE`。退出时 `RemoveClipboardFormatListener(hwnd)`。
- **特点**：事件驱动，无需轮询；Vista 及以上支持。

### 3.2 macOS（darwin）

- **常见方式**：使用 **NSPasteboard**，轮询 `changeCount`，或使用 **NSPasteboardBoardChangedNotification** 等（若可用）。也有通过轮询 `[[NSPasteboard generalPasteboard] changeCount]` 实现。
- **行为**：一旦发现 changeCount 变化（或收到通知），即向 stdout 写 `CLIPBOARD_CHANGE`。

### 3.3 Linux

- **常见方式**：X11 下监听 **XFixesSelectionNotify** 或 **SelectionNotify**；Wayland 下依赖各 compositor 提供的接口或轮询。具体实现因桌面环境而异。
- **行为**：检测到选区/剪贴板变化后，向 stdout 写 `CLIPBOARD_CHANGE`。

---

## 4. 小结

| 问题                   | 答案                                                                                                                                                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 剪贴板监听程序是什么？ | 各平台下的独立可执行文件：`clipboard-event-handler-win32.exe` / `clipboard-event-handler-mac` / `clipboard-event-handler-linux`，本仓库只提供调用方式与约定，不包含其源码。                                                                                     |
| 原理？                 | 子进程调用**系统剪贴板监听 API**（如 Windows 的 AddClipboardFormatListener + WM_CLIPBOARDUPDATE），在检测到系统剪贴板变化时向 **stdout 打印一行 `CLIPBOARD_CHANGE`**；插件通过读子进程 stdout 获知“何时变”，再用 Electron 的 clipboard API 读“变的内容”并入库。 |
| 如何监听？             | 插件侧：启动子进程并监听其 stdout；子进程侧：依赖各平台 API 做事件监听（或轮询 changeCount 等）。无子进程或子进程异常时，插件降级为每 300ms 轮询读剪贴板并比较是否变化。                                                                                        |

如需排查监听不生效，可参考 `docs/fix/剪贴板监听问题排查.md`。

---

## 5. uTools 官方 API 核验（联网结论）

**核验时间**: 2026-01-30。**来源**: uTools 开发者文档 https://www.u-tools.cn/docs/developer/docs.html 及子页。

### 5.1 官方是否提供统一的剪贴板监听 API？

**结论：没有。**

- **事件 API**（`api-reference/utools/events.html`）中仅有：`onPluginEnter`、`onPluginOut`、`onMainPush`、`onPluginDetach`、`onDbPull`。**没有任何剪贴板变化回调**（如 `onClipboardChange`）。
- **复制 API**（`api-reference/utools/copy.html`）提供：`copyText`、`copyFile`、`copyImage`（写剪贴板）、`getCopyedFiles()`（读剪贴板中的文件列表）。**没有“监听剪贴板变化”的接口**。
- preload 可调用 Node.js 与 **Electron 渲染进程 API**；本插件在 preload 中通过 `require('electron').clipboard` 读剪贴板。Electron 的 clipboard 模块本身也**不提供**剪贴板变化事件，需自行轮询或依赖原生能力。

因此：**uTools 官方没有统一的剪贴板监听 API**，插件需自行实现“何时变化”的感知（轮询或外部监听程序）。

### 5.2 最简单的监听方式（在本项目中）

| 方式             | 说明                                                                                                                             | 依赖                                                          | 实时性                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------- |
| **轮询**         | 定时（如 300ms）用 Electron clipboard 读剪贴板，与上一份比较，不同则视为变化并入库。                                             | 仅 preload 暴露的 `clipboard`（Electron），无额外可执行文件。 | 一般（取决于轮询间隔） |
| **外部监听程序** | 启动子进程 `clipboard-event-handler-*`，子进程用系统 API 监听，变化时向 stdout 打 `CLIPBOARD_CHANGE`，插件据此再读剪贴板并入库。 | 需各平台对应可执行文件。                                      | 好（事件驱动）         |

**若追求“最简单、零额外依赖”**：使用**轮询**即可。本项目已在 `initPlugin.js` 的 `addCommonListener()` 中实现（子进程不可用时自动降级），无需改代码即可在无监听程序环境下工作。  
**若追求实时性且可接受分发各平台可执行文件**：继续使用当前**外部监听程序**方案即可。

---

## 6. 各平台监听程序如何获取、开源方案

本项目约定的协议：子进程在检测到系统剪贴板变化时向 **stdout 打印一行 `CLIPBOARD_CHANGE`**（无参数）。以下为各平台可执行文件的获取方式及可用的开源替代。

### 6.1 与本项目协议一致的可执行文件（直接可用）

| 平台                          | 文件名                              | 获取方式                                                                                                                                                                                                                                                                         |
| ----------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Windows**                   | `clipboard-event-handler-win32.exe` | 本仓库 **`docs/clipboard-event-handler-win32.exe`** 已包含，复制到「数据库路径的父目录」即可；或从插件发布页/Releases 下载。                                                                                                                                                     |
| **macOS（Apple Silicon M1）** | `clipboard-event-handler-mac`       | 开源仓库 **[wangyw6716/clipboard-event-handler-mac-apple-silicon-arm64-M1](https://github.com/wangyw6716/clipboard-event-handler-mac-apple-silicon-arm64-M1)** 提供已编译的 `clipboard-event-handler-mac` 及 Swift 源码，适用于 ARM64；下载后放到数据库路径父目录并 `chmod +x`。 |
| **macOS（Intel）**            | `clipboard-event-handler-mac`       | 插件主页/说明中通常有安装方法；若无现成二进制，可用下文开源库自建或使用轮询降级。                                                                                                                                                                                                |
| **Linux**                     | `clipboard-event-handler-linux`     | 文档中写「从项目仓库下载」，具体以插件主页或 Releases 为准；若无现成二进制，可用下文开源库自建或使用轮询降级。                                                                                                                                                                   |

路径规则：`listener.js` 使用的路径 = `dbPath` 中 `_utools_clipboard_manager_storage` **之前**的目录 + 上表文件名。详见 `docs/fix/查找数据库和监听程序路径.md`。

### 6.2 开源、可自建或集成的方案

以下项目**并非**现成的、与当前协议完全一致的「独立可执行文件」，但可用来**自建监听程序**或**改成本地模块**使用：

| 项目                                                                                                                    | 语言/形态                | 平台                | 说明                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[DoumanAsh/clipboard-master](https://github.com/DoumanAsh/clipboard-master)**                                         | Rust **库**              | Win / macOS / Linux | 剪贴板监控库，提供 `Master` + `ClipboardHandler` 回调。可写一个约几十行的 Rust 二进制：在 `on_clipboard_change` 里向 stdout 打印 `CLIPBOARD_CHANGE`，编译为各平台可执行文件，即符合本项目协议。MIT。 |
| **[rust-clipboard/clipboard-rs](https://github.com/rust-clipboard/clipboard-rs)**                                       | Rust **库**              | Win / macOS / Linux | 功能更全的剪贴板库（含监听能力）。同样可自建一个小 CLI，监听变化时输出 `CLIPBOARD_CHANGE`。                                                                                                          |
| **[hxfdarling/clipboard-watch](https://github.com/hxfdarling/clipboard-watch)**                                         | Node **原生模块**（C++） | Win / macOS         | 在进程内通过回调通知剪贴板变化，**不是**独立子进程。若采用需改插件架构：不再 `execFile` 子进程，而是 `require('clipboard-watch')` 并在回调里触发 `handleClipboardChange`。                           |
| **[sudhakar3697/node-clipboard-event](https://github.com/sudhakar3697/node-clipboard-event)**（npm: `clipboard-event`） | Node **原生模块**        | Win / macOS / Linux | 为 Node/Electron 提供剪贴板变化事件。同上，需改为进程内监听而非子进程 + stdout。                                                                                                                     |

**推荐**：  
- **不想改插件代码、只要各平台可执行文件**：Windows 用本仓库 `docs/` 下 exe；macOS M1 用 wangyw6716 的仓库；Intel Mac / Linux 视插件主页或自建。  
- **愿意自建与协议一致的二进制**：用 **clipboard-master** 或 **clipboard-rs** 写一个输出 `CLIPBOARD_CHANGE` 的小 CLI，一次编写可交叉编译出 Win/macOS/Linux 三个可执行文件，便于统一维护。
