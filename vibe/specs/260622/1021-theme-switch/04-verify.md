# 暗色主题与切换验证记录

Tool: codex

## 自动验证

- `pnpm run test:theme`：通过。
  - 覆盖 theme 偏好归一化、`dark` 应用、`system` 解析、`matchMedia` 监听和解绑。
- `pnpm run build`：通过。
  - 备注：Vite 仍输出既有 `pdfjs-dist` eval 打包警告，不是本次主题改动引入。
- `git diff --check`：通过。
- `rg -n "prefers-color-scheme" src`：通过。
  - 结果仅剩 [../../../../src/global/theme.js:6](../../../../src/global/theme.js:6) 的运行时系统主题监听字符串，组件样式已不再直接使用媒体查询。
- `python3 /Users/gdkmjd/work/czz/CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/scripts/audit_code_links.py --root /Users/gdkmjd/work/czz/EzClipboard vibe/specs/260622/1021-theme-switch vibe/specs/PROJECT_STATUS.md`：通过。
- `python3 /Users/gdkmjd/work/czz/CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/scripts/audit_ai_rules.py . --mode project`：通过。

## 浏览器验证

- Vite 本地预览：`pnpm exec vite --host 127.0.0.1 --port 8096`，通过。
- 亮色：`html[data-theme="light"]`、`html.dark=false`、`color-scheme=light`，主界面与设置页保持亮色。
- 暗色：`html[data-theme="dark"]`、`html.dark=true`、`color-scheme=dark`，设置页自有 UI 变暗；Element Plus 变量 `--el-bg-color=#141414`。
- Element Plus MessageBox：暗色下弹窗背景 `rgb(20, 20, 20)`，文字色跟随主题。
- 跟随系统：Playwright `emulateMedia({ colorScheme: 'dark' })` 后解析为暗色；切回 `light` 后解析为亮色。
- 视口：1080×760、920×720、720×720 下 `body.scrollWidth` 等于视口宽度，未发现横向溢出。

## 手动回归状态

- 未在 uTools 真实 shell 内复测剪贴板数据库、快捷键录制和真实系统主题切换。
- 需要后续人工覆盖：主界面全部 tab、收藏子 tab、搜索展开、清空面板、详情抽屉、右键抽屉、标签搜索/编辑、置顶组合编辑、富文件预览、设置页四个 tab 与快捷键录制/When 弹窗。
- 浏览器截图已检查：暗色设置页、暗色 MessageBox、720px 设置页未发现明显重叠或空白错误；连续切换产生的 Toast 叠加为验证脚本瞬态状态。

## 文档与记忆

- 需求文档：[01-spec.md](01-spec.md)。
- 实施计划：[02-plan.md](02-plan.md)。
- 长期记忆：未新增；本次没有沉淀新的跨项目规则。
