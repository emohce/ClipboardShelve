# Tab Scoped Pin Group Plan

Tool: codex

## Plan

1. 重构 [src/storage/pinnedItems.js](../../../../src/storage/pinnedItems.js#L86-L133)
   - 新增合法 Tab type 归一化。
   - 新增 `getPinGroupState()` / `getPinGroup(type)` / `savePinGroup(itemIds, { type })` / `clearPinGroup(type)` / `removePinGroupItems(ids)`。
   - 兼容旧 `itemIds/cursor/updatedAt` 单对象，迁移到 `all` bucket。

2. 调整 [src/views/Main.vue](../../../../src/views/Main.vue#L1210-L1338)
   - 当前列表只读取 `activeTab` 对应 group。
   - 保存/清空/粘贴/编辑只作用于当前 Tab bucket。
   - 删除记录时清理所有 bucket 内的对应 item id。
   - `persistLastActiveContext()` 在 Tab/筛选刷新后继续写最后上下文。

3. 调整 [src/global/quickPasteRuntime.js](../../../../src/global/quickPasteRuntime.js#L149-L202)
   - 运行时 cache 改成按 Type 保存。
   - `quick-paste-pin-group` 根据 `getLastActiveContext().tab` 选择 group/cache。
   - cursor 推进只写回对应 Type。

4. 补充测试
   - storage envelope 兼容与 per-Type 保存/清理。
   - runtime cache 按 Type 隔离，last context 选择对应组合。
   - 原有 hydrate 和 cursor 测试保持通过。

5. 文档同步
   - 更新 quick paste runtime 与 pin-group cache 知识文档。
   - 更新 `PROJECT_STATUS.md` 当前焦点与任务索引。
   - 更新 `verify.md`，运行 code-link audit。

## Status

Completed in this task. Verification details are in [verify.md](verify.md).

## Risks

- 旧 `pin.group` 没有创建来源，只能默认归入 `all`，这是有意兼容策略。
- 收藏子 Tab 不拆分为独立 bucket，避免把标签筛选上下文误建成多套组合。
- 快捷热路径不能每次扫描全部数据，冷启动 fallback 才允许按 id resolve。

## Verification

- `node test-shortcut-command-system.js`
- `node_modules/.bin/vite build`
- `pnpm run build` attempted but blocked by pnpm ignored-builds approval before Vite started.
- `python3 .../audit_code_links.py --root /Users/gdkmjd/work/czz/EzClipboard ...`
- `python3 .../audit_ai_rules.py . --mode project`
