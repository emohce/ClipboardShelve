# Review: 图片与文本悬浮预览优化

Tool: codex

## Review Target
- Requirement: [01-spec.md](01-spec.md)
- Plan: [02-plan.md](02-plan.md)
- Verification: [04-verify.md](04-verify.md)
- Implementation:
  - [../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:398)
  - [../../../src/utils/previewLayout.mjs](../../../src/utils/previewLayout.mjs:1)
  - [../../../test-preview-layout.mjs](../../../test-preview-layout.mjs:1)

## Checked
- Requirement alignment:
  - 文本预览已从单行省略切到逻辑行策略，组件在 [../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:1069) 调用 `getTextPreviewMode()`，样式层已移除 `nowrap` / `text-overflow` 的预览分支。
  - 图片预览已在 [../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:402) 统一调用 `computeImagePreviewLayout()`，策略实现位于 [../../../src/utils/previewLayout.mjs](../../../src/utils/previewLayout.mjs:18)。
- Plan-to-implementation coverage:
  - 新增纯函数测试覆盖 100 行阈值、原尺寸可放下、0.5 缩放阈值、超宽横向滚动、超长纵向滚动：[../../../test-preview-layout.mjs](../../../test-preview-layout.mjs:13)。
  - 右侧悬浮窗口、Shift 预览入口、Shift+方向键滚动 command 未改。
- Risk and compatibility:
  - 未改数据库、配置、默认快捷键、command id、主列表滚动祖先或复制链路。
  - 超宽/超长 90% 策略按“能产生对应滚动”的轴向落地：超宽按高度 90%，超长按宽度 90%。
- Verification evidence:
  - `node test-preview-layout.mjs`: passed.
  - `pnpm run build`: passed, only保留既有 chunk-size warning.
  - in-app browser 加载 `http://127.0.0.1:8099/`: passed with 0 error-level console logs.
  - post-review `curl -I --max-time 3 http://127.0.0.1:8099/`: service stopped after verification.
  - AI rule audit and code-link audit: passed.

## Findings
- P0: none.
- P1: none.
- P2: dev stub 当前无剪贴板行，真实 Shift 触发截图未覆盖；验证记录已标注该缺口。

## Optimization Suggestions
- 后续若需要更强 UI 回归，可在 dev stub 中补可注入的 text/image fixture，让预览 DOM 样式和 Shift+方向键滚动可被浏览器自动化验证。

## Not Checked
- uTools 生产壳真实剪贴板图片来源；本任务不改图片来源、复制链路或存储。
- 当前未保持 `127.0.0.1:8099` dev server 常驻；需要继续浏览器检查时应重新启动 Vite。
