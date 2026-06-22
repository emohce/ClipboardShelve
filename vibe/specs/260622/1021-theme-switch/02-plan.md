# 暗色主题与切换实施计划

Tool: codex

## 步骤

1. 新增主题运行时和无依赖测试，先验证 `light` / `dark` / `system` 归一化、应用、监听与解绑。
2. 在默认设置、读取设置、恢复设置中加入 `userConfig.appearance.theme`，默认 `light`。
3. 在入口初始化主题并监听设置更新；移除 Element Plus 注册阶段对 `html.className` 的直接覆盖。
4. 设置页“功能配置”新增外观主题三段控件，点击后立即 `saveSetting` 并应用主题；保存按钮 payload 同步保留 appearance。
5. 将全局 Less token 改为 `html` 默认亮色、`html[data-theme='dark']` 暗色覆盖，并扫尾主要浅色面板。
6. 补验证记录，更新 [../../PROJECT_STATUS.md](../../PROJECT_STATUS.md)，执行构建、浏览器和文档链接验证。

## 样式扫尾文件

- 设置页主题入口和配置面板：[../../../../src/views/Setting.vue:818](../../../../src/views/Setting.vue:818)，功能列表变量化：[../../../../src/views/Setting.vue:4270](../../../../src/views/Setting.vue:4270)，快捷键列表变量化：[../../../../src/views/Setting.vue:4777](../../../../src/views/Setting.vue:4777)。
- 标签弹窗：[../../../../src/cpns/TagEditModal.vue:352](../../../../src/cpns/TagEditModal.vue:352)，标签输入：[../../../../src/cpns/TagInput.vue:225](../../../../src/cpns/TagInput.vue:225)。
- 置顶组合编辑：[../../../../src/cpns/PinGroupEditor.vue:270](../../../../src/cpns/PinGroupEditor.vue:270)，右键抽屉：[../../../../src/cpns/ClipDrawerMenu.vue:199](../../../../src/cpns/ClipDrawerMenu.vue:199)。
- 富文件预览：[../../../../src/cpns/FileRichPreview.vue:1343](../../../../src/cpns/FileRichPreview.vue:1343)，文本预览暗色选择器：[../../../../src/cpns/ClipItemList.vue:3200](../../../../src/cpns/ClipItemList.vue:3200)。

## 验证计划

- `pnpm run test:theme`
- `pnpm run build`
- Vite + Chrome 只读检查亮色、暗色、跟随系统三种模式下 `html[data-theme]`、`html.dark`、设置页和 Element Plus 弹窗。
- 文档链接审计。

## Soul 进化

- 无。本次是既有紧凑工具 UI 的主题能力补齐，不改变项目 UI soul 或跨项目规则。
