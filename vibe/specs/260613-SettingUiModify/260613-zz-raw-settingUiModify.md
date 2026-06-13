# 设置页布局优化

**基线**：2026-06-13  
**范围**：[`src/views/Setting.vue`](../../../src/views/Setting.vue) 设置页 UI  
**状态**：已实现

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
   - 若当前值与默认值不同，置灰展示默认值并可点击恢复
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

## 非目标

- 弹窗 footer（取消 / 确定 / 关闭）
- 表格行内 link 操作（改键 / 编辑 / 删除）
- 删除 `restoreSetting.js` 或修改 `readSetting` 初始化
- 主界面 `Main.vue` 布局（仅移除重复 overlay 样式）
- 快捷键 SQLite 存储层逻辑变更

## 验证清单

- [ ] 四 Tab 切换正常；左右方向键切 Tab 仍有效
- [ ] 顶栏「返回」「保存」在各 Tab 均可见；长内容滚动时 sticky 不穿透
- [ ] Esc 分层关闭：有弹窗时仅关弹窗，全部弹窗关闭后在非输入区按 Esc 才退出设置；保存后数据仍持久化
- [ ] 存储 Tab 一屏展示：配置区/状态区色块分区清晰，无冗余标题与 JSON 路径行
- [ ] 命令 Tab：工具条一行、列表填满窗口，改键/When/禁用可用
- [ ] 设置页全部弹窗遮罩不透明（When/改键/功能编辑/组合命令/右键菜单/组合草稿）
- [ ] When 弹窗：不透明面板、720px 宽、三列彩色分组条件
- [ ] Esc 仅关弹窗；Esc/Enter/Ctrl+C/Ctrl+R/←/→ 不可绑定；⌨ 固定快捷键提示可悬浮查看
- [ ] 弹窗内 textarea/input 聚焦时 Esc 仍只关弹窗，不退出设置或插件
- [ ] 命令 Tab 范围下拉：选项不截断，筛选与帮助靠右
- [ ] 命令 Tab 列表：仅 ID 列，悬停 ID 整格触发右侧抽屉显示命令中文名
- [ ] 功能配置 Tab：三行紧凑卡片，悬浮预览/全局粘贴/命令动作可用
- [ ] 改键弹窗：遮罩不透明、双栏布局、默认值可点击恢复、按键不穿透底层列表
- [ ] When 弹窗：内容壳实色无穿透、三列分组均衡；偏离默认时灰色默认值可点击恢复；打开时 ↑↓←→ 不滚动列表/不切 Tab
- [ ] 改键/When 弹窗：遮罩深色 0.96、面板实色不透出底层列表（index.less 全局加载后）
