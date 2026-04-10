# 260409 IDEA 别名粘贴实现原理说明

> **基线（相对历史稿）**：别名用于粘贴的磁盘文件已从「仅 `temp` 随机子目录」调整为 **`userData` 下按条目持久 + 内容指纹复用 + 删条目/改别名清理**；详见 [EM-2026-04-10-alias-material-lifecycle](../vibe/vibe-doc/ai-error-memory/2026-04-10-alias-material-lifecycle.md)。

## 目的
- 解释当前“别名粘贴”是怎么实现的。
- 解释为什么在 IDEA 文件树里可能仍然不按 alias 落名。
- 给出下一步可验证的技术方向（不是验收 checklist）。

## 总体设计思路

### 核心原则
1. 不修改文件内容字节（不做“字节码改名”）。
2. 通过**生成一个真实存在且文件名=alias 的临时文件**，把该文件对象放入系统剪贴板。
3. 由目标应用（IDEA）在粘贴时读取剪贴板文件对象并落盘。

换句话说：  
我们控制的是“放进剪贴板的文件对象路径与文件名”，而不是控制 IDEA 内部如何最终命名。

## 当前实现链路

## 1) 单文件 + alias 的链路
- 入口：`shift+Enter` -> `list-save-by-alias`（`src/cpns/ClipItemList.vue`）
- 条件：`单 item && type=file && 单文件 && alias存在`
- 执行函数：`copySingleFileWithAliasAndPaste()`（`src/utils/index.js`）

函数做了这些事：
1. 解析原文件扩展名。
2. 在 **`userData`** 下按**当前条目 id** 落盘（非系统 `temp` 随机目录）：
   - `.../utools-clipboard-manager/alias-material/<sanitize(itemId)>/`
3. 生成目标文件：`<规范化别名><ext>`，与同目录下 `meta.json`（内容指纹、路径）配合：**同条目、同别名、同内容**时可**跳过写盘**直接复用。
4. 把原文件二进制写到该目标文件（若未命中复用）。
5. `utools.copyFile([targetPath])` 放入剪贴板。
6. 触发粘贴快捷键（Cmd/Ctrl + V）。

### 为什么按条目分目录而不是每次随机子目录
- 与剪贴板条目的 **`id` 生命周期**一致，便于**改别名 / 删条目**时删除对应目录，避免 `temp` 下无限堆积。
- 仍通过「规范化别名 + 扩展名」作为展示文件名，降低目标应用读到错误文件名的概率；复用由 **内容指纹**保证「同别名不同内容」会重写。

## 2) 纯图片 + alias 的双轨链路
- 入口同样是 `list-save-by-alias`（`shift+Enter`）
- 条件：`type=image && alias存在`
- 执行函数：`copyImageWithAliasAndPaste()`（`src/utils/index.js`）

函数做了这些事：
1. 从图片条目拿二进制（支持 base64 data URL / file 路径）。
2. 与单文件一致：写入 **`userData/.../alias-material/<itemId>/`** 下的 `<alias>.<ext>`（含复用逻辑）。
3. 优先 `utools.copyFile([targetPath])` 走文件对象粘贴。
4. 若失败，回退到原图片粘贴（`copyImage` 路径）。

## 为什么“现在可能不行”

即使我们放入的是 alias 文件对象，IDEA 最终落名仍可能不符合预期，常见原因有：

1. **目标应用对剪贴板文件对象的处理策略**  
   IDEA 不是简单“按路径文件名落地”，某些场景会做内部重命名、冲突改名、导入策略改写。

2. **剪贴板数据优先级问题**  
   系统剪贴板可能同时存在多种 flavor（文件对象、文本、图片），IDEA 可能选择了非文件 flavor。

3. **路径/权限或 sandbox 影响**  
   临时目录路径对目标进程可见性、权限、时序（文件尚未稳定可读）都会影响粘贴结果。

4. **IDEA 粘贴上下文差异**  
   “项目树粘贴”与“编辑器粘贴”是两套逻辑，前者更依赖平台文件传输语义，不一定与 Finder 完全一致。

## 明确边界（当前方案能保证什么）

当前代码能保证：
- 在粘贴前，存在 alias 命名的真实磁盘文件（默认在 **`userData` 别名缓存目录**，必要时复用已有文件）。
- `utools.copyFile` 使用的是该 alias 文件路径。

**别名相关持久化分工**：
- **别名文本**：`utools.dbStorage` 的 `item.alias.map`（与 [`ITEM_ALIAS_STORAGE_KEY`](../src/utils/index.js) 一致）。
- **别名粘贴用文件**：上述 `alias-material` 目录；**删除历史条目**或 **`dbStorage` 中该 id 别名发生变化**时会触发清理（见 `cleanupAliasStateForDeletedItem` / `removeAliasMaterialForItem`）。

当前代码不能强保证：
- IDEA 一定按该文件名落地（这取决于 IDEA 对剪贴板 flavor 的最终选择和导入策略）。

## 下一步建议（技术向）

如果你确认“文件已按 alias 生成，但 IDEA 落名仍不对”，建议按这个顺序定位：

1. 在 `copySingleFileWithAliasAndPaste()` / 控制台过滤 `[alias-paste]`，确认最终 `targetPath` 与是否 `reuse`。
2. 在 Finder 目标目录粘贴一次：
   - 若 Finder 正常按 alias，问题更偏 IDEA 粘贴策略；
   - 若 Finder 也异常，问题在 copyFile/路径或时序。
3. 对比 IDEA 两个入口：
   - 项目树粘贴
   - 编辑器粘贴  
   看是否只在某一个上下文失效。
4. 若仅 IDEA 项目树异常，可考虑引入“IDEA 专用降级策略”：
   - 失败时提示“请先粘贴到 Finder 再拖入 IDEA”，或
   - 提供“复制 alias 文件绝对路径文本”作为辅助（非主路径）。

## 相关代码位置
- `src/cpns/ClipItemList.vue`：`list-save-by-alias` 分支入口；`setItemAlias`（别名变更时清缓存）
- `src/utils/index.js`：
  - `copySingleFileWithAliasAndPaste`
  - `copyImageWithAliasAndPaste`
  - `resolveImageBufferAndExt`
  - `writeAliasMaterialFile`、`removeAliasMaterialForItem`、`cleanupAliasStateForDeletedItem`
- `src/global/initPlugin.js`：`removeItemViaId` 内删除条目后调用 `cleanupAliasStateForDeletedItem`

