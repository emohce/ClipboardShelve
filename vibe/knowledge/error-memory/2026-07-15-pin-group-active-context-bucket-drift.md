---
id: EM-2026-07-15-pin-group-active-context-bucket-drift
status: verified
scope: EzClipboard quick-paste pin group
fingerprint: quick-paste-pin-group|saved-tab-bucket-vs-last-active-context-drift|cross-type-fallback-is-not-a-fix|sync-context-on-ui-save
first_seen: 2026-07-15
last_verified: 2026-07-15
review_after: 2026-10-15
evidence:
  - user-confirmed
  - code
  - test
tags:
  - quick-paste
  - pin-group
  - active-context
  - tab-bucket
---

# EM-2026-07-15 置顶组合保存分桶与触发上下文漂移

Tool: codex

## 症状

用户从当前列表保存置顶组合后，全局“循环粘贴组合项”没有粘贴内容并直接隐藏窗口；组合成员同时属于单项置顶时更容易被误判为两套置顶机制冲突。

## 错误思路

- 把 `pin.item.map` 与 `pin.group` 的成员重叠当作根因。
- 在目标 Tab 没有组合时跨 Type 回退，以掩盖保存分桶与触发上下文不一致。
- 只检查组合 cache 是否有成员，不先比对保存 Type 与 `pin.lastActiveContext.tab`。

## 已验证根因

`quick-paste-pin-group` 严格读取 `pin.lastActiveContext.tab` 对应的 `pin.group.groups[type]`。如果 UI 保存组合时只写 group bucket、没有同时确立该 Type 为最新触发上下文，运行时会正确地把另一个空 bucket 判为“无组合”。单项置顶 map 与组合成员重叠本身不会阻止粘贴。

权威行为见 [quick-paste-runtime.md](../quick-paste-runtime.md) 与 [quick-paste-pin-group-cache.md](../quick-paste-pin-group-cache.md)。实现边界见 [pinnedItems.js](../../../src/storage/pinnedItems.js#L175-L201) 和 [Main.vue](../../../src/views/Main.vue#L1337-L1356)。

## 正确检测顺序

1. 比对 UI 保存的 group `type` 与触发时 `pin.lastActiveContext.tab`。
2. 确认同 Type bucket 的 `itemIds`、cache entries 与 cursor。
3. 再检查成员 payload 是否能通过 repository 按 id hydrate。
4. 最后检查静默粘贴 API；不要把上下文漂移与原生粘贴 API 问题混为一谈。

## 预防规则

- UI 保存组合必须把当前过滤上下文作为 `activeContext` 交给 group 保存边界，并由保存边界把 `tab` 归一到实际 group Type。
- 运行时仅推进 cursor 时不得重写最新 Tab 上下文。
- 保持严格同 Type 消费；不得通过跨 Type fallback 修复上下文同步缺口。

## Alternative Route

- status: `verified`
- preconditions: 组合按顶层 Tab Type 分桶，且全局入口使用 `pin.lastActiveContext.tab`。
- ordered steps:
  1. 在 UI 保存动作传入当前 `activeContext`。
  2. 保存 group bucket 后，把 context 的 `tab` 强制归一到该 bucket Type。
  3. 保持运行时同 Type 读取与 cursor 轻量写回不变。
- verification: [test-shortcut-command-system.js](../../../test-shortcut-command-system.js#L985-L1002) 覆盖“成员同时单项置顶 + 旧上下文为其他 Tab + 保存后立即循环触发”。
- applicability boundary: 不处理 payload hydrate 缺失或 `hideMainWindowPaste*` 不可用；这些问题分别走现有 payload 与静默粘贴错误记忆。
- fallback: 若同 Type 仍失败，检查完整 payload 解析和原生静默粘贴 API，不扩大到跨 Type fallback。
