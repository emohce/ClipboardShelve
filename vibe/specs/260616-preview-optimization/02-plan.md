# Plan: 图片与文本悬浮预览优化

Tool: codex

## 1. 变更目标
- 文本 Shift 预览取消 100 行以内的单行末尾折叠，改为自动换行。
- 图片 Shift/悬浮预览先判断完整展示可行性；不可行时按超宽/超长一轴滚动策略展示。
- 保留现有右侧悬浮窗口、Shift+方向键移动和悬浮触发链。

## 2. 现状与根因
- 文本根因：旧逻辑在 [../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:1069) 用单行判断决定省略号，而不是按逻辑行数判断是否需要完整展示。
- 图片根因：旧策略在 [../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:398) 直接按长宽比例进入滚动分支，忽略“默认窗口可放下或轻度缩小即可放下”的情况。
- 测试根因：布局计算原本嵌在组件中，无法用 Node 脚本直接覆盖边界。

## 3. 设计方案
- 新增 [../../../src/utils/previewLayout.mjs](../../../src/utils/previewLayout.mjs:1)，承载文本逻辑行判断和图片布局计算。
- [../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:398) 只负责读取窗口可用尺寸、应用返回的样式和滚动状态。
- 超宽图按可用高度 90% 展示以产生横向滚动；超长图按可用宽度 90% 展示以产生纵向滚动。

## 4. 知识与约束
- required memory:
  - [Project status](../PROJECT_STATUS.md)
  - [Memory index](../../knowledge/MEMORY_INDEX.md)
  - [UI structure guardrails](../../vibe-doc/ai-error-memory/2026-06-09-ui-structure-interaction-guardrails.md)
- implementation path: 先写失败测试，再新增纯函数，再接入组件，再同步文档和验证记录。
- rejected alternatives:
  - 只改 CSS：不能解决图片比例先行分支。
  - 宽图按宽度 90%：不会产生横向滚动，无法保留 Shift+左右移动特色。
- scope guardrails: 不改快捷键绑定、不改主列表滚动祖先、不改悬浮预览开关配置。

## 5. 受影响文件
- [../../../src/utils/previewLayout.mjs](../../../src/utils/previewLayout.mjs:1): 纯函数布局策略。
- [../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:182): 预览策略接入。
- [../../../test-preview-layout.mjs](../../../test-preview-layout.mjs:1): 回归测试。
- [../PROJECT_STATUS.md](../PROJECT_STATUS.md): 项目过程中台。

## 6. 数据与状态变更
- 无数据库、配置、环境变量或持久化结构变更。
- 仅新增运行时 `wrapText` 文本预览状态，替代旧 `isSingleLine`。

## 7. 接口与交互变更
- 用户可观察变更：100 行以内长文本预览自动换行；可完整展示的横/竖图不再被比例规则强制滚动。
- 保持兼容：Shift 预览、Shift+方向键滚动、鼠标悬浮预览开关、图片加载失败提示。

## 8. 实施步骤
1. 新增 `test-preview-layout.mjs`，先观察缺失模块失败。
2. 新增 `previewLayout.mjs`，覆盖文本和图片尺寸策略。
3. 接入 `ClipItemList.vue`，删除单行省略样式分支。
4. 补 spec / plan / verify，并更新 `PROJECT_STATUS.md`。
5. 运行 Node 测试、构建、浏览器手工检查和文档链接审计。

## 9. 进度反馈点
- start: 已确认分支、工作树和 UI 防误改记忆。
- after major edit: 纯函数测试通过，组件接入完成。
- after verification: 写入 [04-verify.md](04-verify.md)。
- closeout: 最终回复报告验证、风险、记忆与过程文档状态。

## 10. 测试与验证方案
- `node test-preview-layout.mjs`
- `pnpm run build`
- `pnpm run serve` 后用 in-app browser 检查页面可加载；必要时通过浏览器控制台注入测试数据验证预览 DOM 样式。
- AI 规则审计：
  - `python3 /Users/gdkmjd/work/czz/CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/scripts/audit_ai_rules.py . --mode project --fix-links`
  - `python3 /Users/gdkmjd/work/czz/CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/scripts/audit_ai_rules.py . --mode project`

## 11. 风险与回滚点
- 风险：超宽/超长策略若方向反了，会出现没有滚动条但提示可移动；由纯函数测试和浏览器样式检查覆盖。
- 风险：文本面板 100 行以内仍可能视觉高度超出；由 `max-height` 和内部滚动兜底。
- 回滚点：还原 [../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:398) 的布局计算，并删除新增工具和测试。

## 12. 待确认项
- 无。
