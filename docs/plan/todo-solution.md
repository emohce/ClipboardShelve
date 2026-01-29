---
title: TODO 功能实现方案
subtitle: 基于现有代码结构的分解与落地步骤
---

## 1. 现状要点（代码依据）
- 主界面已实现清除记录抽屉（`clear-panel`）及热键：弹层内 Tab 焦点循环、`Ctrl+Enter` 确认清除、`Ctrl+Delete` 打开清除抽屉；同时保持原有 Tab/Alt+数字/Escape 等全局键盘逻辑 @src/views/Main.vue。
- 列表组件 `ClipItemList` 统一承接删除/多选/抽屉菜单等交互：
  - `ArrowRight` 打开抽屉菜单、`ArrowLeft/Escape` 关闭；菜单支持上下方向键、Enter、Ctrl+数字快捷选择与拖拽排序持久化 @src/cpns/ClipItemList.vue @src/cpns/ClipDrawerMenu.vue。
  - 已支持 `Ctrl+D` 收藏（多选批量/单项）、锁定/解锁（`Ctrl+L` / `Ctrl+Shift+L`）、删除跳过锁定与 `Ctrl+Delete` 强制删除 @src/cpns/ClipItemList.vue。
  - 多选列表清空会自动退出多选 @src/cpns/ClipItemList.vue。
- 搜索组件：Delete 在光标末尾时将删除意图上抛，Backspace 删除到空字符串时通知父组件退出搜索 @src/cpns/ClipSearch.vue。
- 数据层：已引入收藏数据单独存储（`collects/collectData`）与 `locked` 字段，并在删除与清理时尊重锁定规则 @src/global/initPlugin.js。
- 设置页：已按“存储/展示/自定义”分组并移除头部外链按钮，布局更简洁 @src/views/Setting.vue。

## 2. 功能方案分解
### 2.1 清除记录抽屉（样式/键盘）
1) UI：在现有 `clear-panel` 内增加栅格/行高、卡片化按钮风格；时间范围选项改为双列布局并增加副标题描述。
2) 热键：
   - 在 `keyDownCallBack` 中增加 `Ctrl+Enter` 映射到确认清除；Tab 顺序聚焦：范围选项 -> 取消 -> 确定。
   - `Ctrl+Tab/Shift+Tab` 仍沿用全局 Tab 切换逻辑，需在弹层显示时阻止默认 Tab 并自定义焦点序列。
3) 交互：关闭时自动移除键盘焦点，保持现有 `toggleFullData` 与数据刷新逻辑不变。

### 2.2 抽屉菜单（查看全部）
1) 触发：
   - 列表项高亮时，右方向键打开“查看全部”抽屉；左方向键关闭。
   - `Ctrl+序号` 直接执行对应菜单项；`Ctrl+Shift+序号` 执行子菜单（未落地）。
   - ESC 关闭。
2) UI/定位：
   - 新建 `ClipDrawerMenu` 组件（挂在 `ClipItemList` 同层），接受当前高亮项 DOMRef 与操作列表，计算右侧偏移定位（使用 `getBoundingClientRect`）。
   - 列表使用纵向 `[{index, title, icon}]`，支持拖拽排序（使用 `vuedraggable` 或原生 `dragstart/dragover/drop`）。
3) 数据源：
   - 复用 `operation`（默认 + 自定义）与 `useClipOperate` 的 id/行为映射；增加“查看全部”合集（收藏/取消收藏/复制/粘贴/删除/打开文件夹/自定义）并加上 index。
   - 排序结果持久化到本地存储（可存放在 `utools.dbStorage` 新 key，例如 `drawer.order`）。
4) 键盘导航：上下方向键在菜单内移动，Enter/ Ctrl+Enter 执行；执行后抽屉关闭并保持列表高亮。

5) 未完成项补充（子菜单 Ctrl+Shift+序号）：
   - 目标：在列表高亮时，不打开菜单也能直接触发抽屉子菜单动作；或者在菜单打开时触发“sub action”。
   - 建议落点：
     - 方案 A（菜单内）：`ClipDrawerMenu` 的 `keydownHandler` 中，数字快捷目前只处理 `Ctrl+数字`；改为在 `isCtrl && shiftKey` 时将 `meta.sub = true` 透传给父组件（当前 Enter 已支持 `sub` 透传）。
     - 方案 B（列表层）：`ClipItemList.keyDownCallBack` 在 `drawerShow.value === false` 时捕获 `Ctrl+Shift+数字`，映射到 `drawerItems` 的对应项并调用 `handleOperateClick(op, currentItem)`。
   - 注意：避免与全局 Tab/Alt 数字、以及收藏/锁定等快捷键冲突；Mac 需兼容 `metaKey`。

### 2.3 数据结构优化与锁定
1) 模型：在 `window.db.dataBase.data` 每条记录增加 `locked: boolean`；数据库 CRUD 层（添加、删除、批量删除、清理）均需尊重该标记。
2) 标记入口：
   - 在列表热键：`Ctrl+L` 设置锁，`Ctrl+Shift+L` 取消锁；在 `ClipItemList` keydown 分支新增。
   - 在抽屉菜单中增加“锁定/解锁”项（图标锁型）。
3) 保护规则：
   - 普通 Delete/Backspace、多选删除、清理弹层均跳过 `locked` 项。
   - `Ctrl+Delete`（强制删除）可删除锁定项。
4) 待优化点：
   - UI 提示（未落地）：锁定项在列表加锁图标/样式；删除/清理时弹出“跳过已锁定 X 条”。
   - 清除抽屉的锁定规则提示（可选）：清除后提示“已清除 N 条，跳过锁定 M 条”。

### 2.4 键盘监听补充
1) 普通页：`Ctrl+D` 收藏当前高亮；多选时批量收藏。接入 `window.db.addCollect`，与 `isCollected` 状态刷新一致。
2) 收藏页：保留现状（无额外操作）；收藏与取消收藏走同一操作映射。
3) 所有 Tab：
   - 多选下 `Ctrl+Enter` 批量合并复制：当前实现为多选时 Enter 触发 `onMultiCopyExecute(true)`；若需要“仅 Ctrl+Enter 才合并复制”，可在 `ClipItemList` 增加区分逻辑（未落地）。
   - 合并文本换行符：当前使用 `\n` 拼接；若要“获取系统换行符”，建议在渲染进程使用 `window.exports.os.EOL`（如已暴露）或通过主进程注入常量（未落地）。
   - 右方向键触发抽屉（见 2.2）。
   - 搜索：在 `ClipSearch` 监听 Backspace，当删除到空字符串时触发父组件退出搜索并把焦点移回窗口。
   - 多选状态：当最后一项被取消时自动退出（在 `selectItemList` watch 或删除逻辑判断 length === 0）。
   - 悬浮预览（未落地）：在列表项上监听 `mouseenter`，根据 `type` 展示浮层。
     - 图片：复用 `<el-image :preview-src-list>`。
     - 文本：复用现有 `el-tooltip`，或做单独的预览浮层（显示更多行）。
     - 文件：优先展示文件名列表 + 路径；Excel/PDF 先给降级方案：展示文件元信息 + 提供“打开所在文件夹/打开文件”的操作入口。
   - 图标 hover 提示（未落地）：为所有按钮/图标添加 `title` 或 `el-tooltip`。

### 2.5 配置页简化
1) 移除头部 6 个外链按钮与相关 `handleLinkClick` 常量。
2) 重排表单：按“存储 -> 展示 -> 自定义”三段分组，提升留白，使用 `el-divider`/`el-space`，并在右上放返回按钮。
3) 代码清理：删除未用链接数组、`listenStatus` 点击跳转，保留监听状态展示与保存/重置逻辑。

## 3. 实施优先级与拆解
1) 键盘监听与锁定标记（影响删除安全）
2) 抽屉菜单与收藏/批量复制快捷键
3) 清除记录弹层样式与键盘流
4) 悬浮预览与提示
5) 配置页简化与样式

## 4. 关键改动点清单（文件级）
- `src/views/Main.vue`：
  - 清除面板布局与焦点序列；清除范围过滤与收藏页清除策略。
- `src/cpns/ClipItemList.vue`：
  - 抽屉触发/导航、Ctrl+D 收藏、锁定/解锁、删除时跳过 locked、多选清空自动退出。
  - 待补：`Ctrl+Shift+序号` 子菜单触发、合并复制换行符策略。
- `src/cpns/ClipSearch.vue`：Backspace 清空后触发退出搜索回调；Delete 标记继续复用。
- `src/cpns/ClipDrawerMenu.vue`（新增）：菜单渲染、键盘/拖拽排序、定位与关闭控制。
- `src/views/Setting.vue`：移除头部按钮，优化分组与排版。
- 数据层（`window.db` 相关模块）：扩展数据结构 `locked`，清理与删除函数过滤锁定项，持久化排序与锁状态。

## 5. 兼容性与测试要点
- 确认 uTools 快捷键与系统快捷键不冲突；Mac 需同时支持 `metaKey`。
- 多选删除与锁定：回归 Delete/Backspace、Ctrl+Delete、清除面板、收藏页行为。
- 抽屉菜单：键盘、鼠标（点击/拖拽）、位置跟随高亮项。
- 悬浮预览：大文件/图片懒加载，避免阻塞；PDF/Excel 预览提供降级提示。
- 配置页：保存/重置流程及存储兼容旧设置。

## 6. 下一步（对应 todo.md 未完成项）
1) 抽屉子菜单：实现 `Ctrl+Shift+序号`（见 2.2-5）。
2) 合并复制换行符：明确“系统换行符”的获取方式与运行环境暴露（见 2.4）。
3) 文件类型原始地址：
   - 若 `utools.getCopyedFiles()` 返回结构包含来源信息（例如 `path` 已足够），可在记录结构中增加 `sourcePath` 或 `rawPaths`（未落地）。
4) 悬浮预览与图标提示：按 `type` 分支做统一浮层/tooltip，先做降级版本避免大文件卡顿（未落地）。
