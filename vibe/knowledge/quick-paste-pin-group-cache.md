# Quick Paste Pin Group Runtime Cache

Tool: codex

父文档：[quick-paste-runtime.md](quick-paste-runtime.md)

## Decision

置顶组合静默粘贴使用主页面维护的运行时缓存，而不是每次触发时按 id 重新匹配条目。

## Cache Shape

- `type`: `clipboard-item`
- `value`: 每个 entry 一个完整、可直接粘贴的剪贴板 item；`dataPath + 空 data` 的外置 payload 轻量行必须先 hydrate，不能进入 cache
- `sourceIndex`: 组合原始顺序，用于 cursor 循环

只接受 `text`、`image`、`file`。多值需求应新增独立 `type`，不要把 `clipboard-item` 扩成数组。

实现：[quickPasteSelection.js](../../src/global/quickPasteSelection.js#L1)、[quickPasteRuntime.js](../../src/global/quickPasteRuntime.js#L1)

## Update Timing

仅在 pin/group 相关时机同步 cache：

- 初始化已有组合、保存、清空
- 删除可见条目导致成员变化
- 列表内直接粘贴组合项并更新 cursor

普通数据刷新、监听器 `change`、`view-change` **不**刷新 cache。

实现：[Main.vue](../../src/views/Main.vue#L1) `syncQuickPastePinGroupCache`

## Runtime Rule

`quick-paste-pin-group`：优先读运行时 cache 并推进内存 cursor；成功后轻量落盘 cursor。仅冷启动且 cache 未建立时允许 id 解析兜底。热路径不做 id 匹配。

## Do Not

- 不要在普通刷新、搜索、tab 切换或监听器变化时重建 cache
- 不要在静默热路径上扫 `knownItems` / `getItemById`
- 不要把 `clipboard-item` 扩成多值数组
