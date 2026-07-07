# Quick Paste Pin Group Runtime Cache

Tool: codex

父文档：[quick-paste-runtime.md](quick-paste-runtime.md)

## Decision

置顶组合静默粘贴使用主页面维护的运行时缓存，而不是每次触发时按 id 重新匹配条目。缓存按顶层 Tab type 分桶，避免“全部”创建的组合在“收藏 / 图片 / 文字”等 Tab 中展示或触发。

## Cache Shape

- envelope: `currentType`、`groups[type]`、`updatedAt`；`groups` 显式保留 `collect`、`all`、`text`、`image`、`file` 五个 bucket，空组合也保留空 cache
- group cache: `type`、`operation: pin-group`、`itemIds`、`entries`、`cursor`、`updatedAt`
- entry `type`: `clipboard-item`
- entry `value`: 每个 entry 一个完整、可直接粘贴的剪贴板 item；`dataPath + 空 data` 的外置 payload 轻量行必须先 hydrate，不能进入 cache
- entry `sourceIndex`: 组合原始顺序，用于 cursor 循环

只接受 `text`、`image`、`file`。多值需求应新增独立 `type`，不要把 `clipboard-item` 扩成数组。

实现：[quickPasteSelection.js](../../src/global/quickPasteSelection.js#L1)、[quickPasteRuntime.js](../../src/global/quickPasteRuntime.js#L1)

## Update Timing

仅在 pin/group 相关时机同步 cache：

- 初始化已有组合：同步每个已有 Type bucket
- 保存、清空：只更新当前 Tab type bucket
- 删除可见条目导致成员变化：清理所有 Type bucket 中的被删 item id，并同步所有 bucket
- 列表内直接粘贴组合项并更新当前 Tab type 的 cursor

普通数据刷新、监听器 `change`、`view-change` 和普通 Tab 切换 **不**重建组合 cache。

## Hotkey Boundary

全局快捷键是 cache consumer，不是 cache invalidator：

- `quick-paste-pin-group` 只读取 `pin.lastActiveContext.tab` 对应 bucket。
- 成功粘贴后只推进并写回该 bucket 的 `cursor`。
- 当前 type 无组合、粘贴失败、窗口隐藏、热键 settle、队列串行、Tab/Pad/Type 投影切换，都不得清理完整 cache envelope。
- 若功能语义需要清理，例如用户明确清空当前 Type 组合，只能清空该 Type bucket；删除底层 item 只能从各 bucket 移除该 item，不得丢弃其他 bucket。

实现：[Main.vue](../../src/views/Main.vue#L1) `syncQuickPastePinGroupCache`

## Runtime Rule

`quick-paste-pin-group`：先读 `pin.lastActiveContext.tab`，再选同 type 运行时 cache 并推进内存 cursor；成功后只轻量落盘该 type 的 cursor。仅冷启动且该 type cache 未建立时允许解析同 type 的 `pin.group.groups[type]`。热路径不做跨 type id 匹配。

## Do Not

- 不要在普通刷新、搜索、tab 切换或监听器变化时重建 cache
- 不要在静默热路径上扫 `knownItems` / `getItemById`
- 不要把 `clipboard-item` 扩成多值数组
- 不要在当前 type 没有组合时 fallback 到其他 Tab 的组合
- 不要把全局快捷键触发、循环推进、无匹配或 Pad / Tab / Type 切换当作清空整个 cache 的理由
