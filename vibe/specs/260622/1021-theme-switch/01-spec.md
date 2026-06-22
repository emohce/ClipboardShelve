# 暗色主题与切换

Tool: codex

## 目标

- 当前默认 UI 固定为亮色主题，新老用户缺省 `light`。
- 支持 `light` / `dark` / `system` 三种外观偏好，选择后立即保存并应用。
- 自有 Less 变量和 Element Plus 的 `html.dark` 保持同源，避免只改 Element Plus、不改业务 UI。

## 范围

- 主题配置写入 `setting.userConfig.appearance.theme`，缺失或非法值归一化为 `light`。
- 主题运行时负责解析系统深浅色，设置 `html[data-theme]`、`html.dark` 和 `color-scheme`。
- 设置页“功能配置”新增外观主题三段控件，不改变主界面顶栏密度。
- 主界面、设置页、弹窗、标签、组合编辑、富预览和右键抽屉中的浅色面板改用主题变量。

## 关键入口

- 主题运行时：[../../../../src/global/theme.js:20](../../../../src/global/theme.js:20)。
- 启动与设置更新应用主题：[../../../../src/main.js:15](../../../../src/main.js:15)。
- 读配置归一化：[../../../../src/global/readSetting.js:23](../../../../src/global/readSetting.js:23)，恢复默认配置归一化：[../../../../src/global/restoreSetting.js:21](../../../../src/global/restoreSetting.js:21)。
- Element Plus 注册入口移除直接覆盖 `html.className`：[../../../../src/global/registerElement.js:61](../../../../src/global/registerElement.js:61)。
- 设置页控件：[../../../../src/views/Setting.vue:818](../../../../src/views/Setting.vue:818)，即时保存：[../../../../src/views/Setting.vue:2562](../../../../src/views/Setting.vue:2562)，保存按钮 payload：[../../../../src/views/Setting.vue:2897](../../../../src/views/Setting.vue:2897)。
- 主题 token：[../../../../src/style/index.less:14](../../../../src/style/index.less:14)，暗色覆盖：[../../../../src/style/index.less:69](../../../../src/style/index.less:69)。

## 非目标

- 不新增依赖。
- 不修改剪贴板数据、SQLite schema、快捷键模型、uTools runtime asset 生成逻辑。
- 不重设计整体 UI，只补齐主题能力和浅色硬编码。

## 风险

- 设置页保存 payload 较大，必须保留既有 `preview`、`lineJoin`、`shortcutSync` 等 userConfig 分支。
- `system` 只通过主题运行时监听 `matchMedia('(prefers-color-scheme: dark)')`，组件样式不得继续直接使用 `prefers-color-scheme`。
- 暗色主题要兼顾局部滚动容器和抽屉/弹窗，不应破坏 `.clip-item-scroll`、搜索展开、快捷键录制输入等既有交互。

## Knowledge Context

- required: [../../PROJECT_STATUS.md](../../PROJECT_STATUS.md), [../../../knowledge/MEMORY_INDEX.md](../../../knowledge/MEMORY_INDEX.md), [../../../knowledge/developer-soul.md](../../../knowledge/developer-soul.md)
- related: [../../../vibe-doc/ai-error-memory/2026-06-09-ui-structure-interaction-guardrails.md](../../../vibe-doc/ai-error-memory/2026-06-09-ui-structure-interaction-guardrails.md)
- memory routing: 本次为项目级主题能力；除状态中台和任务文档外，不新增长期规则。
