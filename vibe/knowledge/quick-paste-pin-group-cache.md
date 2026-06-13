# Quick Paste Pin Group Runtime Cache

Tool: codex

## Decision

置顶组合静默粘贴使用主页面维护的运行时缓存，而不是每次触发时按 id 重新匹配条目。

## Cache Shape

缓存 entry 使用与粘贴规则绑定的精确结构：

- `type`: 当前 pin/group 只使用 `clipboard-item`。
- `value`: 当前 pin/group 每个 entry 只缓存一个完整、可直接粘贴的剪贴板 item。
- `sourceIndex`: 保留组合原始顺序，用于 cursor 循环。

`clipboard-item` 只接受 `text`、`image`、`file` 这类可进入 `copyAndPasteAndExit` 的 item。后续如果需要多值或其他数据形态，不要把 `clipboard-item` 扩成数组；应新增更精确的 `type`，并为该 type 定义独立粘贴筛选和执行规则。

证据：

- [src/global/quickPasteSelection.js](../../src/global/quickPasteSelection.js:60) 构建结构化 cache。
- [src/global/quickPasteRuntime.js](../../src/global/quickPasteRuntime.js:101) 从主页面接收完整 item cache。
- [test-shortcut-command-system.js](../../test-shortcut-command-system.js:303) 验证 cache 只解析一次，后续 cursor 循环不再 id 匹配。

## Update Timing

主页面只在 pin/group 相关时机维护这份 cache：

- 初始化已有置顶组合。
- 保存置顶组合。
- 清空置顶组合。
- 删除可见条目导致组合成员变化。
- 直接粘贴某个组合项并更新 cursor。

普通剪贴板数据刷新、监听器 `change`、`view-change` 不刷新这份 cache，避免把静默路径重新耦合到全量数据扫描。

证据：

- [src/views/Main.vue](../../src/views/Main.vue:1227) 定义组合 cache 同步函数。
- [src/views/Main.vue](../../src/views/Main.vue:1243) 删除可见条目后同步组合 cache。
- [src/views/Main.vue](../../src/views/Main.vue:1285) 保存组合时直接写入完整 item cache。
- [src/views/Main.vue](../../src/views/Main.vue:1299) 清空组合时清 cache。
- [src/views/Main.vue](../../src/views/Main.vue:1826) 初始化已有组合 cache。

## Runtime Rule

静默触发 `quick-paste-pin-group` 时，优先完整读取运行时 cache 并推进内存 cursor；成功后只轻量落盘 cursor。只有冷启动且 cache 尚未建立时，才允许 id 解析作为兜底。静默热路径不得做 id 匹配，也不得把不符合当前粘贴规则的值交给粘贴执行。

证据：

- [src/global/quickPasteRuntime.js](../../src/global/quickPasteRuntime.js:133) 有 cache 时直接返回运行时 cache。
- [src/global/quickPasteRuntime.js](../../src/global/quickPasteRuntime.js:165) 静默触发读取 cache entry。
- [src/global/quickPasteRuntime.js](../../src/global/quickPasteRuntime.js:169) 成功后保存 cursor 并更新内存 cursor。

## Do Not

- 不要在普通数据刷新、搜索刷新、tab 切换或监听器变化时重建置顶组合 cache。
- 不要在静默触发热路径上按 id 扫 `knownItems` 或调用 `getItemById`。
- 不要把 `clipboard-item` 扩成多值数组；多值需求必须新增更精确的 cache type 和粘贴规则。
