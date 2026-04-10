# Error Memory: EM-2026-04-10-alias-material-lifecycle

## 1. 背景与症状
- 别名粘贴依赖「生成真实磁盘文件 + `utools.copyFile`」；早期实现把文件写在 **系统 `temp` 下随机子目录**，每次操作新建目录，**无法复用**，且**不会在改别名或删条目时清理**，临时目录持续堆积。
- 期望行为：别名文本已由 `dbStorage`（`item.alias.map`）持久化；**用于粘贴的别名文件**也应落在稳定、可复用位置，并在**别名变更**或**历史条目删除**时自动回收。

## 2. 错误归类
- `framework-misuse`（对「临时」与「可复用缓存」边界未区分）
- `environment-assumption`（假设 `temp` 下随机路径适合作为长期语义载体）

## 3. 误判链路
- 把「避免同名覆盖」简单等同于「每次全新随机目录」，未考虑条目级生命周期与清理钩子。

## 4. 已证伪方案
- 仅依赖 `temp/.../alias-files/<timestamp-rand>/` 作为唯一落盘策略，且不挂删除/改名清理（会导致孤儿目录与不可复用）。

## 5. 已确认通路
- **持久根目录**：`utools.getPath('userData')` + `utools-clipboard-manager/alias-material/`（与 JSON 库同属用户数据区，非系统临时区语义）。
- **按条目分目录**：`alias-material/<sanitize(itemId)>/`，磁盘文件名为 **`<规范化别名><扩展名>`**，与剪贴板展示文件名一致。
- **复用**：同条目、同别名、同内容 **MD5（无 `crypto` 时长度等兜底）** 时跳过写盘，直接 `copyFile` 已有路径；`meta.json` 记录 `alias`、`sig`、`materialPath`。
- **改名或换内容**：同目录内若 `meta` 指向的旧 `materialPath` 与新路径不同，**先 `unlink` 旧文件**再写新文件。
- **别名映射变更**：[`setItemAlias`](../../../src/cpns/ClipItemList.vue) 中若 `dbStorage` 内该 id 的别名前后不一致，调用 [`removeAliasMaterialForItem`](../../../src/utils/index.js) 删除整段缓存目录。
- **删除历史条目**：[`DB.removeItemViaId`](../../../src/global/initPlugin.js) 成功后调用 [`cleanupAliasStateForDeletedItem`](../../../src/utils/index.js)：删 `alias-material` 目录 + 删除 `item.alias.map` 中该 id。
- **整目录删除**：优先 `window.exports.rmSync`（若 preload 暴露）；否则按 `meta.json` 的 `materialPath` + `unlink` + `rmdirSync` 降级。

## 6. 适用触发条件
- 实现或排查「别名粘贴落盘路径」「磁盘占用」「改别名后仍粘贴旧文件名」等问题时检索本条。

## 7. 禁止再试的做法
- 在已存在条目级生命周期与 `dbStorage` 映射的前提下，仍仅用无关联的随机 `temp` 子目录承载别名文件且不清理。

## 8. 推荐优先策略
- 别名落盘与 **条目 `id` 绑定**；清理与 **别名映射变更**、**条目删除** 两处钩子对齐。
- 需要复用时用 **内容指纹**，避免「同别名不同图」误复用。

## 9. 关联文件 / 模块
- [`src/utils/index.js`](../../../src/utils/index.js)：`writeAliasMaterialFile`、`removeAliasMaterialForItem`、`cleanupAliasStateForDeletedItem`、`ITEM_ALIAS_STORAGE_KEY`
- [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue)：`setItemAlias`、`list-save-by-alias`
- [`src/global/initPlugin.js`](../../../src/global/initPlugin.js)：`removeItemViaId` 内清理调用

## 10. 后续观察点
- preload 是否补充 `rmSync`：决定整目录删除是否一次成功。
- 升级前历史遗留的 `temp/.../alias-files` 可手工清理，代码侧不再写入。
