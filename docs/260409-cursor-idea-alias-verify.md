# 260409 IDEA 别名粘贴改造验证清单

## 基线信息
- 基线时间：2026-04-09
- 范围：仅验证“别名保存快捷触发（`shift+Enter`）”相关改造，不覆盖其他功能。
- 目标：
  - 单文件 + alias 在 IDEA 文件树粘贴时按 alias 落名。
  - 纯图片 + alias 走“双轨”：优先文件对象粘贴，失败回退图片粘贴。
  - 不破坏既有组合粘贴/纯文本粘贴行为。

## 变更落点（用于对照）
- 复制与别名工具逻辑：[`src/utils/index.js`](../src/utils/index.js)
- 快捷键执行分支：[`src/cpns/ClipItemList.vue`](../src/cpns/ClipItemList.vue)
- 规格补充：[`specs/003-quick-item-operation/spec.md`](../specs/003-quick-item-operation/spec.md)
- 快速回归说明：[`specs/003-quick-item-operation/quickstart.md`](../specs/003-quick-item-operation/quickstart.md)
- 错误记忆正文：[`vibe/vibe-doc/ai-error-memory/2026-04-09-alias-prompt-hotkey-layer.md`](../vibe/vibe-doc/ai-error-memory/2026-04-09-alias-prompt-hotkey-layer.md)
- 错误索引：[`vibe/ai-rules/00-error-memory.md`](../vibe/ai-rules/00-error-memory.md)

## 验证前准备
- [ ] 插件已重新加载到最新代码。
- [ ] IDEA 已打开目标项目目录，并定位到需要粘贴的文件夹。
- [ ] EzClipboard 中已存在以下样本条目：
  - [ ] A：单文件条目（仅 1 个文件）+ 已设置 alias
  - [ ] B：纯图片条目 + 已设置 alias
  - [ ] C：组合粘贴条目（多文件或复杂对象）
  - [ ] D：纯文本条目

## 场景 1：单文件 + alias（核心）
1. 在 EzClipboard 选中 A（单文件 + alias）。
2. 按 `shift+Enter`。
3. 切到 IDEA 文件树目标目录执行粘贴。

预期：
- [ ] 成功生成文件，文件名为 `alias + 原扩展名`。
- [ ] 不出现旧文件名落地（或旧缓存路径文件被粘贴）的现象。
- [ ] 控制台无新的致命错误（SyntaxError/TypeError）。

失败时记录：
- 实际落地名称：
- 是否粘贴到了旧路径文件：
- EzClipboard 控制台日志（关键 5-10 行）：

## 场景 2：纯图片 + alias（双轨）
1. 在 EzClipboard 选中 B（纯图片 + alias）。
2. 按 `shift+Enter`。
3. 在 IDEA 文件树目标目录粘贴。

预期：
- [ ] 优先出现按 alias 命名的图片文件落地（文件对象通路成功）。
- [ ] 若当前目标不接受文件对象，则回退为普通图片粘贴，不应卡死或无响应。
- [ ] 不影响图片原有预览/复制主流程。

失败时记录：
- 是否出现 alias 文件：
- 是否触发回退提示：
- 最终粘贴结果（文件/图片/失败）：

## 场景 3：组合粘贴与纯文本回归
### 3.1 组合粘贴
1. 选中 C，按 `shift+Enter` 并在目标位置粘贴。
预期：
- [ ] 保持原组合粘贴行为，不进入“按 alias 重命名”。

### 3.2 纯文本
1. 选中 D，按 `shift+Enter` 并粘贴。
预期：
- [ ] 保持原文本粘贴行为，不进入文件/图片别名分支。

## 场景 4：边界条件回归
### 4.1 无 alias 的单文件
1. 选中“单文件但无 alias”条目，按 `shift+Enter`。
预期：
- [ ] 给出“无 alias”相关提示或按默认粘贴，不报错。

### 4.2 多选状态
1. 进入多选并执行 `shift+Enter`。
预期：
- [ ] 不误走“单文件+alias 重命名”分支。

## 快速判定（是否可进入下一步）
- [ ] 场景 1 通过
- [ ] 场景 2 通过
- [ ] 场景 3 通过
- [ ] 场景 4 通过

结论：
- [ ] 通过，可继续后续发布/收口
- [ ] 未通过，需根据失败记录继续修复

## 已知定位提示（复查用）
- 若出现“粘贴名不稳定/旧名落地”，优先核查 [`src/utils/index.js`](../src/utils/index.js) 中别名文件生成路径是否唯一子目录。
- 若出现“纯图片 alias 不生效”，优先核查 [`src/cpns/ClipItemList.vue`](../src/cpns/ClipItemList.vue) 的 `list-save-by-alias` 是否进入图片分支。
- 若出现“运行时报语法错误”，先看控制台报错文件与行号，确认最新代码已加载。
