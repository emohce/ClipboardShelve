# EM-2026-06-13：设置页弹窗样式写在 scoped 组件内导致 teleport 未命中

## 症状

改键/When 弹窗已配置 `setting-modal-overlay`、`:modal="true"` 与实色面板类名，但遮罩仍为浅色 `--overlay-color`、面板透出底层列表；硬刷新或重启 dev server 后仍如此。

## 错误思路

- 认为在 [`src/style/index.less`](../../../src/style/index.less) 增加 `.setting-modal-overlay` / `.shortcut-record-dialog` 规则即可生效，即使该文件仅通过某组件 `<style scoped>` 内的 `@import` 间接加载。
- 认为 [`Setting.vue`](../../../src/views/Setting.vue) scoped 样式足以覆盖 `el-dialog` teleport 到 `<body>` 后的内层结构（`.shortcut-record-panel`、`.when-editor-shell` 等）。
- 弹窗视觉仍半透明时，继续调高遮罩 rgba 或加 `!important`，而不检查样式是否真正进入全局作用域。

## 正确思路

- 主题变量与 Element 全局覆写、设置页弹窗遮罩/实色规则必须在 [`src/main.js`](../../../src/main.js) **顶层** `import './style/index.less'`，作为独立全局样式表注入。
- `el-dialog` 默认 teleport 到 `body`：命中遮罩与内层面板需 **全局** 选择器（含 `.el-overlay.setting-modal-overlay` 与 `.shortcut-record-dialog .shortcut-record-panel` 等），不可依赖父组件 scoped。
- 固定按键说明等长文案悬浮：优先 `el-popover` + `placement="top-start"` + 不透明 `popper-class`，避免 `el-tooltip` `placement="bottom"` 与弹窗内容重叠。
- 弹窗打开时除遮罩外，还需 `setting-shortcut-record` / `setting-when-edit` 热键层 + `keyDownHandler` 短路，避免 ↑↓←→ 穿透设置页滚动/切 Tab。

## 禁止再试

- 将 [`index.less`](../../../src/style/index.less) 仅挂在任意 Vue 组件的 scoped `<style>` 中，作为设置页/弹窗全局样式的唯一入口。
- 仅凭改 [`Setting.vue`](../../../src/views/Setting.vue) scoped 样式解决 teleport 弹窗遮罩或内层半透明问题。

## 详见

- 任务 spec：[../../specs/260613-SettingUiModify/260613-zz-raw-settingUiModify.md](../../specs/260613-SettingUiModify/260613-zz-raw-settingUiModify.md)
- 全局样式入口：[../../../src/main.js](../../../src/main.js)、[../../../src/style/index.less](../../../src/style/index.less)
