# Error Memory: EM-2026-04-06-json-db-debounce-persist

## 1. 背景与症状
- 删除或修改剪贴历史后，当前会话列表正确，但隐藏窗口或退出重进后记录“恢复”，磁盘 JSON 未反映变更。

## 2. 错误归类
- `framework-misuse`（防抖刷新回调再次走非 immediate 的 `updateDataBaseLocal`，从未执行 `writeFileSync`）

## 3. 已确认通路
- `updateDataBaseLocal` 中非 immediate 分支：`updateDataBase` + `debouncedWriteLocal`。
- `debouncedWriteLocal` 定时器到期后必须执行带 `immediate: true` 的落盘（或等价的一次性 `writeFileSync`），否则会再次仅入队防抖而不写文件。

## 4. 关联文件
- `src/global/initPlugin.js`：`debouncedWriteLocal`、`updateDataBaseLocal`

## 5. 推荐优先策略
- 防抖定时器回调内调用 `db.updateDataBaseLocal(undefined, { immediate: true })`，避免递归进入仅调度下一轮定时器的路径。
- 对 `visibilitychange`（隐藏）/`pagehide` 调用 `flushPendingDbToDisk()`，取消待处理定时并立刻落盘，避免未满防抖间隔就退出时丢改。
