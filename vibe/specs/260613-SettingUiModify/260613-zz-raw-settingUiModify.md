# 设置页布局优化

**基线**：2026-06-13  
**范围**：[`src/views/Setting.vue`](../../../src/views/Setting.vue)、[`src/style/index.less`](../../../src/style/index.less)、[`src/main.js`](../../../src/main.js)  
**状态**：布局与弹窗基线已实现（2026-06-13）；**改键弹窗多键交互**已由 [260613-shortcut-multi-key-plan.md](260613-shortcut-multi-key-plan.md) 实现（顶替下文 §17 / §21 / §23）

## 变更摘要

1. **顶栏操作区**：「返回」「保存」从底部 footer 移至 Tab 导航右侧（`.setting-header-bar` + `.setting-header-actions`），`position: sticky` 固定展示。
2. **移除全局重置**：删除底部「重置」按钮及 `handleRestoreBtnClick`；`restoreSetting.js` 保留（`readSetting` 初始化仍依赖）。
3. **行内按钮统一**：引入 `.setting-section-action`；主操作 `type="primary" plain`，次操作 `plain`。
   - 存储 Tab：修改 / 打开 / 再次尝试迁移
   - 功能 Tab：新增自定义功能
   - 功能配置 Tab：绑定置顶项、绑定组合项、配置命令等
4. **功能配置「命令与动作」**：SQLite / Macro SQLite 状态徽标移至描述区 `.feature-config-status-row`，右侧仅保留操作按钮。
5. **存储 Tab 一屏精简**：
   - 去除与 Tab 重复的「存储」「存储模式」标题及 divider
   - 最大历史 + 保存时间合并为一行；引擎/迁移/更新时间合并为状态条
   - 去除与根路径重复的 JSON 备份行；SQLite / 素材路径改为紧凑条带
   - 配置区与状态区用 `.setting-panel` 色块区分，缩小行距与控件高度
6. **功能 Tab 一屏精简**：
   - 控制条合并为一行：主页选择、搜索、计数、过滤态、帮助、新增
   - 去除冗余标题/副标题/功能列表头；表格行改为单行展示
   - 表格区色块包裹，压缩行高与列宽
7. **功能 Tab 列表重构**：
   - 工具条改为 `.feature-strip` 单行 chip 布局（`+` 新增、圆角搜索）
   - 弃用 `SettingPagedTable`，改用 `vuedraggable` 卡片列表 `.feature-list-item`
   - 去除表头与「操作」空列；快捷键用 `.feature-kbd` 键帽样式；自定义项悬停显示编辑/删除
8. **功能 Tab 填满窗口**：设置页与功能列表区 flex 撑满 `100vh`，列表滚动区随窗口高度伸展
9. **命令 Tab 精简**：
   - 工具条单行：SQLite/Fallback、计数、搜索、范围筛选、帮助
   - 弃用 `SettingPagedTable`，改为 `.shortcut-list-item` 卡片列表
   - 命令名与 ID 单行；快捷键键帽样式；悬停显示 键/W/复/禁 操作
   - 列表区 flex 填满窗口
12. **命令列表网格均衡**：表头 + 7 列 grid 对齐；操作按钮 `el-tooltip` 悬浮提示
10. **顶栏与命令工具条压缩**：
   - Tab/返回/保存高度降至 26px，减弱阴影
   - 命令工具条单行：`SQLite·138/138` + 搜索 + 范围下拉 + 帮助
11. **功能配置 Tab 比例缩放**：
   - 去除「预览配置」标题与 divider，三行紧凑卡片
   - 开关/按钮缩至 22–26px；说明收入 HelpHint
   - 命令动作行：状态 chip + 命令/组合/菜单/新增 chip 按钮
13. **命令 Tab UI 优化（快捷键 Tab）**：
   - 全局遮罩/对话框样式迁移至 [`src/style/index.less`](../../../src/style/index.less)（`html` 同步 CSS 变量），设置页打开时 overlay 不再失效
   - Esc 分层关闭：`closeTopSettingOverlay()` 优先关改键/When/功能弹窗/MessageBox，无遮罩才退出设置
   - 改键与 When 弹窗互斥；When builder `max-height` 滚动
   - 工具条：`.shortcut-strip-actions` 将范围下拉与帮助靠右；移除 `fit-input-width`；`shortcut-scope-popper` 至少 4 汉字宽，↑↓ 自动扩充
   - 命令列表 6 列：ID 列宽减半；悬停 ID 自文字右缘抽屉铺满至操作列前，命令名尽量完整展示、溢出再省略
   - 改键/When 弹窗 body 背景、when-builder 窄屏 2/1 列、条件按钮加大
15. **When 弹窗视觉回归**：
   - 宽度 720px；面板全局强制不透明背景（teleport 场景）
   - 条件区恢复三列彩色分组（界面层 / 状态 / 弹层），每组内选项带 是/否 渐变按钮
16. **Esc 与固定按键**：
   - 设置页 Esc 仅关闭弹窗，不退出设置页
   - `NON_CONFIGURABLE_SHORTCUT_IDS`：Esc / Enter / Ctrl+C / Ctrl+R / ← / → 不可绑定
   - 命令 Tab 工具条 ⌨ 提示 + 改键弹窗悬浮说明
17. **改键弹窗（录制快捷键）**：
   - 启用 `setting-modal-overlay` 遮罩，`:modal="true"`，背景不透明、带边框
   - 双栏均分：左「当前绑定」、右「按下新快捷键」；顶部展示命令名与 ID
   - 录制时激活 `setting-shortcut-record` 层并拦截设置页方向键，避免穿透
   - 左栏「当前绑定」内**始终**展示灰色默认值（只读 chip）；仅当当前值/新组合偏离默认时，右侧追加显式「重置」按钮恢复默认
18. **设置页弹窗统一不透明与 Esc 分层**：
   - When / 功能编辑 / 组合命令 / 右键菜单 / 组合草稿全部使用 `setting-modal-overlay` + `:modal="true"`；移除 `setting-float-overlay` 透明遮罩
   - [`src/style/index.less`](../../../src/style/index.less) 为 `.feature-dialog` 补实色底板规则；弹窗背景增加 hex fallback（light `#ffffff` / dark `#151b24`）
   - `keyDownHandler` 将 Esc 处理提前至 `isEditableTarget` 之前：有弹窗时 `closeTopSettingOverlay()`，无弹窗且非输入焦点才 `emit('back')`，避免 textarea 内 Esc 穿透至 uTools 宿主
19. **When 弹窗视觉与穿透统一（仿改键弹窗）**：
   - 遮罩不透明度提升至 0.96；[`src/style/index.less`](../../../src/style/index.less) 将 `.command-macro-dialog` 纳入实色强制规则并新增共享类 `.setting-modal-body-shell`
   - When 弹窗内容包裹于 `.when-editor-shell` 实色内容壳；`.when-builder-option` 去除 `rgba(255,255,255,*)` 半透明底，改用 `var(--bg-soft-color)` 实色
   - 录制/编辑时激活 `setting-when-edit` 热键层；`keyDownHandler` 在 When/改键/功能/组合草稿弹窗打开时跳过方向键 Tab 切换与 Ctrl+F，避免穿透
   - When 当前值偏离 `defaultWhen` 时，置灰展示默认摘要并可点击恢复（`restoreWhenEditToDefault`）
20. **弹窗样式全局加载修复（teleport 命中）**：
   - [`src/main.js`](../../../src/main.js) 顶部静态 `import './style/index.less'`，移除 [`ClipWordBreak.vue`](../../../src/cpns/ClipWordBreak.vue) scoped 块中的 `@import`
   - 根因：`el-dialog` teleport 到 `body`，scoped/组件内加载的全局规则无法稳定命中遮罩与内层面板
   - [`src/style/index.less`](../../../src/style/index.less) 增加 `.el-overlay.setting-modal-overlay` 与改键/When 弹窗内层实色背景全局规则（面板/壳/分组/选项）
21. **改键弹窗交互收尾**：
   - 「固定按键不可绑定」提示置于弹窗内容最上方
   - 长说明改用 `el-popover`（`placement="top-start"`）+ `.shortcut-record-reserved-popper` 不透明浮层，避免与双栏内容重叠
   - 默认值展示并入左栏「当前绑定」：默认值 chip 始终展示（`shortcutRecordDefaultId` 存在即显示）；`showShortcutRecordDefaultRestore` 仅控制「重置」按钮，在 baseline 或 editing 任一偏离 `defaultShortcutId` 时显示
23. **改键弹窗默认值常显 + 显式重置**：
   - 左栏由「偏离默认才显示默认值」改为「默认值常驻只读 chip」，便于随时对照当前值与默认值
   - 默认值不再点击即恢复；改为当前值≠默认值时追加 `.shortcut-record-default-reset`「重置」按钮，点击调用 `restoreShortcutRecordToDefault`
   - 样式：`.shortcut-record-default-value` 改为只读样式（去 hover/cursor）；新增 `.shortcut-record-default-reset` 按钮样式；移除 `.shortcut-record-default-hint`「点击恢复」
22. **Tab 栏与内容区铺满**：
   - `.sub-tab-nav` 改为 `flex: 0 0 auto`，Tab 按钮去掉过大 `min-width`；顶栏 `justify-content: flex-start` + 操作区 `margin-left: auto`
   - 缩小卡片/内容区水平边距；各 Tab shell 去掉左右 padding；命令/功能搜索框取消 `max-width` 限制
24. **外层间距二次压缩（四 Tab 统一）**：
   - 卡片：`margin 6px 8px → 2px 4px`，`border-radius 24px → 16px`
   - 内容壳：`.setting-card-content` `padding 8px 6px 4px → 4px 4px 2px`；`.sub-tab-content` `8px 0 6px → 4px 0 2px`；`.sub-tab-content--fill` `padding: 0`
   - 顶栏：`.setting-header-bar` `margin/padding` 减薄
   - 命令/功能列表：shell `gap 6px → 3px`；`.shortcut-strip` / `.feature-strip` 与 `.shortcut-list-scroll` / `.feature-list-scroll` 合并为单块面板（上圆角 strip + 下圆角 list，`border-top: none`）
   - 列表行：命令 `min-height 34px → 28px`，功能 `30px → 26px`；表头/操作按钮同步缩小；ID drawer `height 28px → 24px`
   - 存储/功能配置：`.setting-panel`、`.setting-storage-compact`、`.feature-config-row--compact` 间距同步下调
26. **外边距清零 + 顶栏 text+2px**：
   - 四边红框区域：`el-card` `margin: 0`、`border-radius: 0`；`.setting-card-content` / `.sub-tab-content` / `.setting-header-bar` 全部 `padding: 0`
   - 全局 [`setting.less`](../../../src/style/cpns/setting.less) 遗留 `.setting-card { margin: 12px }` 与 `&-content { padding: 14px }` 同步置 0
   - 顶栏变量 `--setting-tab-h: calc(12px + 2px)`，Tab/返回/保存同高；`.sub-tab-nav` 胶囊 `padding: 1px; border-radius: 6px`
   - 功能配置行：去外扩 `box-shadow`，`.feature-config-control--compact` 防 nowrap 溢出；顶栏 `width: 100%` 与内容同宽对齐
27. **列表区内边距清零（功能/命令/存储/功能配置）**：
   - 全局 `setting.less` `&-item` 遗留 `margin/padding` 置 0
   - 功能/命令：strip + list-scroll + 列表行 `padding: 0`；shell `gap: 0`；圆角 `0`
   - 顶栏去掉渐变透明底，避免与工具条之间视觉空隙
   - 存储 `.setting-panel`、功能配置 `.feature-config-row--compact` 内边距置 0

25. **改键弹窗多键交互（已由 [260613-shortcut-multi-key-plan.md](260613-shortcut-multi-key-plan.md) 顶替 §17/21/23）**：
   - 底部单行录制（去掉中部右 capture 与 manual input）
   - 收录后底部右侧 ✅ → 中部右「待绑定」；确定时合并左「当前绑定」∪ 右「待绑定」
   - Command 行右侧：默认值 + 恢复默认（清除全部非默认键）
   - 中部左/右均多行 kbd + ❌；冲突录入硬阻断
   - Esc/取消 dirty 校验；仅顶栏保存落盘

## 核心知识点

### 设置页弹窗三层防护

1. **视觉**：`modal-class="setting-modal-overlay"`（约 0.96 不透明）+ `.setting-modal-dialog` 实色壳 + 内层 `.shortcut-record-panel` / `.when-editor-shell` 等实色块（规则须在全局 [`index.less`](../../../src/style/index.less)）。
2. **热键层**：改键 `setting-shortcut-record`、When `setting-when-edit`；打开时 `activateLayer`，关闭时 `deactivateLayer`，使设置页 binding 不命中。
3. **文档级短路**：[`Setting.vue`](../../../src/views/Setting.vue) `keyDownHandler` 在编辑弹窗打开时跳过 ↑↓←→ Tab 切换与 Ctrl+F，Esc 仍走 `closeTopSettingOverlay()`。

### 全局样式入口

- 权威入口：[`src/main.js`](../../../src/main.js) → `import './style/index.less'`。
- 主题 CSS 变量定义在 `html, #app`；弹窗 teleport 到 `body` 仍可继承变量，但**选择器必须全局**才能命中 teleport 节点。
- 禁止再将 `index.less` 作为唯一入口挂在某组件 scoped `<style>` 内。

### 改键/When 默认值恢复

| 弹窗 | 比较字段 | 展示位置 | 恢复函数 |
|------|----------|----------|----------|
| 改键 | `defaultShortcutIds[]` vs active+pending | **Command 行右侧**默认值 +「恢复默认」 | `restoreShortcutRecordToDefault`（清非默认） |
| When | `defaultWhen` vs `whenEditInput` | 内容壳底部条 | `restoreWhenEditToDefault` |

> 改键弹窗完整布局与状态机见 [260613-shortcut-multi-key-plan.md](260613-shortcut-multi-key-plan.md)。

保存前仅为工作副本；须点顶栏「保存」后 `shortcutStore` 落盘。

### Tab 布局要点

- Tab 条不应 `flex: 1` 撑满顶栏，否则 Tab 胶囊与「返回/保存」之间出现大块空白。
- 内容区铺满：`.setting-card-content` / `.sub-tab-content` / 顶栏 `padding: 0`；卡片 `margin: 0`、`border-radius: 0`；列表 shell `padding: 0`；顶栏 `--setting-tab-h: calc(12px + 2px)`

## 错漏与误区

| 现象 | 错误假设 | 正确做法 |
|------|----------|----------|
| 遮罩仍浅色、面板透出列表 | 已在 index.less 写规则即生效 | 确认 main.js 全局 import；勿仅靠 ClipWordBreak scoped @import |
| 改键弹窗模板已新但样式像旧的 | 缓存未刷新 | 改 index.less 入口后需重启 dev server；根因通常是样式未全局命中而非 HMR  alone |
| When 弹窗条件块与背景文字叠读 | 只加强遮罩即可 | 内层 `.when-builder-option` 等须实色底；半透明 rgba 仍会叠字 |
| 固定按键说明悬浮压住双栏 | `el-tooltip placement="bottom"` | 改 `el-popover` + `top-start` + 不透明 popper |
| 默认值条单独占一行过散 | 与双栏并列展示 | 并入左栏；默认值常显只读 chip，偏离默认时才出「重置」按钮 |

正式误区归档：[../../knowledge/error-memory/2026-06-13-setting-dialog-teleport-global-less.md](../../knowledge/error-memory/2026-06-13-setting-dialog-teleport-global-less.md)

## 非目标

- When 弹窗 footer 语义变更
- 表格行内 link 操作（改键 / 编辑 / 删除）— 改键**弹窗内**布局见 multi-key plan
- 删除 `restoreSetting.js` 或修改 `readSetting` 初始化
- 主界面 `Main.vue` 布局（仅移除重复 overlay 样式）
- 快捷键 SQLite 存储层逻辑变更 — **已由 multi-key plan 纳入**（cmd 级 override + shortcut_ids）

## 验证清单

- [ ] 四 Tab 切换正常；无编辑弹窗时左右方向键切 Tab 仍有效
- [ ] 顶栏 Tab 条紧凑、无大块空隙；下方列表/配置行横向铺满
- [ ] 顶栏「返回」「保存」在各 Tab 均可见；长内容滚动时 sticky 不穿透
- [ ] Esc 分层关闭：有弹窗时仅关弹窗，全部弹窗关闭后在非输入区按 Esc 才退出设置；保存后数据仍持久化
- [ ] 存储 Tab 一屏展示：配置区/状态区色块分区清晰，无冗余标题与 JSON 路径行
- [ ] 命令 Tab：工具条一行、列表填满窗口，改键/When/禁用可用
- [ ] 设置页全部弹窗遮罩不透明（When/改键/功能编辑/组合命令/右键菜单/组合草稿）
- [ ] When 弹窗：内容壳实色无穿透、三列分组均衡；偏离默认时灰色默认值可点击恢复；打开时 ↑↓←→ 不滚动列表/不切 Tab
- [x] 改键弹窗：遮罩深色 0.96、实色壳；固定按键说明在顶部 popover；Command 行默认值 + 恢复默认；底部单行录制 → ✅ → 待绑定；确定合并；冲突硬阻断；按键不穿透底层列表（多键 spec 已实现）
- [ ] Esc/Enter/Ctrl+C/Ctrl+R/←/→ 不可绑定；弹窗内 input/textarea 聚焦时 Esc 仍只关弹窗
- [ ] 命令 Tab 范围下拉：选项不截断，筛选与帮助靠右
- [ ] 命令 Tab 列表：悬停 ID 抽屉显示命令中文名
- [ ] 功能配置 Tab：三行紧凑卡片，悬浮预览/全局粘贴/命令动作可用

## Knowledge Context

- **required**：本 spec、[260613-shortcut-multi-key-plan.md](260613-shortcut-multi-key-plan.md)（改键弹窗权威）、[../../knowledge/error-memory/2026-06-13-setting-dialog-teleport-global-less.md](../../knowledge/error-memory/2026-06-13-setting-dialog-teleport-global-less.md)
- **related**：[260610-shortcuts-redesign/12YG2-zz-summary-快捷键重构全景文档.md](../260610-shortcuts-redesign/12YG2-zz-summary-快捷键重构全景文档.md)
- **memory routing**：error-memory（teleport 全局样式）、task spec（布局与弹窗交互）
