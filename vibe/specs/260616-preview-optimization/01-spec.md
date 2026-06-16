# Feature: 图片与文本悬浮预览优化

Tool: codex

## 1. 目标
- 文本预览在 100 个逻辑行以内直接自动换行展示，不再对单行长文本做末尾省略。
- 图片预览先判断默认右侧悬浮窗口能否完整展示；能完整展示或缩小不超过 2 倍时直接完整展示。
- 无法完整展示的超宽/超长图片继续保留 Shift+方向键移动特色。

## 2. 背景
- 当前文本预览入口位于 [../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:1057)，旧逻辑把单行文本设为 `nowrap + ellipsis`，会遮掉用户希望看到的完整内容。
- 当前图片布局入口位于 [../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:398)，旧逻辑先按 3:1 比例分支，没有先评估默认预览区是否能完整容纳。
- 当前 Shift+方向键滚动入口位于 [../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:437)，必须保留。

## 3. 用户场景
- 用户按住 Shift 预览一段只有 1 行但较长的文本时，应直接看到自动换行后的完整内容。
- 用户预览普通图片、小图、可轻度缩小的横图/竖图时，应优先完整展示。
- 用户预览无法完整展示的极宽或极长图片时，应看到有效放大的主体，并可用 Shift+方向键移动剩余区域。

## 4. 非目标
- 不调整主列表滚动容器、搜索焦点、列表导航、删除锚点、默认快捷键或 command 注册。
- 不改变图片复制、文件图片预览来源、悬浮预览开关配置、数据库或设置存储。
- 不引入新依赖，不重排主页面结构。

## 5. 知识上下文
- required:
  - [Project status](../PROJECT_STATUS.md)
  - [Memory index](../../knowledge/MEMORY_INDEX.md)
  - [UI structure guardrails](../../vibe-doc/ai-error-memory/2026-06-09-ui-structure-interaction-guardrails.md)
- related:
  - [Shortcut compact semantics](../260613-SettingUiModify/260614-shortcut-compact-semantics.md)
- new memory candidates:
  - 本任务为局部预览策略优化，暂不晋升长期知识。
- memory routing: none

## 6. 范围防偏
- in scope: 文本预览换行策略、图片预览尺寸策略、轻量纯函数测试、任务验证记录。
- out of scope: 全局快捷键体系、设置页布局、主列表导航算法、存储迁移。
- must preserve: Shift 按住显示/释放隐藏、Shift+上下滚动文本、Shift+左右/上下移动图片、右侧悬浮预览窗口。
- stop and confirm when: 需要改默认快捷键、持久化配置、删除既有列表交互保护时。

## 7. 验收标准
- `node test-preview-layout.mjs` 覆盖 100 行文本阈值、完整展示、0.5 缩放阈值、超宽/超长滚动分支。
- `pnpm run build` 通过。
- 真实页面手工验证文本不再单行省略；图片普通/超宽/超长预览可用；Shift 移动不回归。

## 8. 边界与异常
- “100 行以内”按原始文本 `\n` 分割后的逻辑行数计算。
- “缩小 2 倍以内”按完整展示所需比例 `>= 0.5` 计算。
- 为保留 Shift 移动，超宽图按可用高度 90% 渲染并横向滚动；超长图按可用宽度 90% 渲染并纵向滚动。

## 9. 影响范围
- [../../../src/utils/previewLayout.mjs](../../../src/utils/previewLayout.mjs:1): 新增可测预览布局纯函数。
- [../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:182): 接入文本和图片预览策略。
- [../../../test-preview-layout.mjs](../../../test-preview-layout.mjs:1): 新增布局策略回归测试。

## 10. 待确认项
- 无。
