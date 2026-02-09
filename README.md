# 剪贴板（uTools 插件 `eClipboard`）

多类型剪贴板历史管理（文本/图片/文件）、收藏分组、快速粘贴、多选合并、操作抽屉、桌面预览、可配置快捷键与主页功能。

## 核心特性
- 多类型历史：文本/图片/文件自动入库，空文本过滤，按更新时间倒序。
- 去重与写回：内容 MD5 去重；复制后写回剪贴板保持可粘贴状态（文本/图片）。
- 收藏分离：收藏独立存储并保留收藏时间，可锁定避免误删。
- 来源信息：尝试读取文件路径、前台窗口标题，便于追溯来源。
- 稳健监听：优先原生监听，失败自动降级 300ms 轮询。
- 多选合并：批量复制/粘贴，含图片/文件时自动走文件合并流程。
- 操作区可配：主页功能可勾选、排序，支持自定义跳转功能。
- 快捷键分层：主界面/搜索态/抽屉/清除对话框/全文预览/设置层屏蔽删键。

## 目录与代码地图
- 插件元数据：`public/plugin.json`（名称、入口、预加载、平台、命令词）@public/plugin.json#1-20
- 入口：`src/main.js` 初始化插件并挂载 Vue @src/main.js#1-11
- 核心逻辑：`src/global/initPlugin.js` 数据库、监听、降级、收藏/锁定/删除等 @src/global/initPlugin.js#31-871
- 快捷键体系：`hotkeyBindings.js`/`hotkeyLabels.js`/`hotkeyLayers.js`/`hotkeyRegistry.js` @src/global/hotkeyBindings.js#1-141 @src/global/hotkeyLabels.js#1-109 @src/global/hotkeyLayers.js#1-46 @src/global/hotkeyRegistry.js#1-165
- 页面：`views/Main.vue` 主界面、搜索、多选、清除对话框 @src/views/Main.vue#1-240；`views/Setting.vue` 存储/快捷键/功能配置与自定义功能管理 @src/views/Setting.vue#1-185
- 组件：`src/cpns/*`（列表、全文预览、搜索、操作抽屉、悬浮按钮等）
- 数据：`src/data/operation.json` 内置操作 @src/data/operation.json#1-11；`src/data/setting.json` 默认配置模板（路径/条数/天数、展示功能、自定义示例）@src/data/setting.json#1-80

## 页面与层级
- **App.vue**：HotkeyProvider 包裹，主界面/设置页切换；进入设置时启用 `setting` 层屏蔽主界面删键 @src/App.vue#1-29。
- **主界面 (Main.vue)**：
  - 标签页：历史 / 收藏等（ClipSwitch）。
  - 列表：ClipItemList 展示文本/图片/文件，支持操作抽屉、全文预览、大图预览。
  - 搜索：可展开/收起，搜索态有独立快捷键。
  - 多选：空格或按钮开启，批量复制/粘贴，自动合并文件/图片。
  - 清除对话框：按时间范围清除当前标签页（收藏需先取消收藏）。
- **设置页 (Setting.vue)**：
  - 存储：路径查看/修改/打开，最大条数、保存天数（无限为 null）。
  - 快捷键：展示当前有效绑定（含用户覆盖结果）。
  - 功能：主页功能勾选/排序，自定义功能新增/编辑/删除（匹配条件 + 跳转命令）。

## 快捷键（默认）
- 主界面：Tab/Shift+Tab 切分页；Ctrl+1~9 切标签；Ctrl+F 搜索；Ctrl+alt+F 搜索收藏标签; Esc 退出；↑/↓/Ctrl+K/J 导航；← 全文预览；→ 操作抽屉；Enter 复制；Ctrl+Enter 复制并锁定；Ctrl+C 复制；Ctrl+S 收藏；Ctrl+U 锁定；Shift+Del/Backspace 开清除框；Del/Backspace 删除；Ctrl+Del/Backspace 强制删锁定；空格多选；Shift 预览图片/文字；Alt+1~9 快速复制；Ctrl+Shift+1~9 抽屉子功能 @src/global/hotkeyBindings.js#84-139.
- 搜索态：Ctrl+Del/Backspace 删除，Ctrl+Shift+Del 强删 @src/global/hotkeyBindings.js#84-88.
- 抽屉：Esc/← 关闭；↑/↓ 导航；Enter/Ctrl+Enter 选中；Ctrl+1~9 直选 @src/global/hotkeyBindings.js#61-77.
- 全文预览：Esc/→ 关闭 @src/global/hotkeyBindings.js#79-83.
- 清除对话框：数字 1/2/3/4/5 选范围；Tab/Shift+Tab 切换；Enter 确认；Esc 关闭 @src/global/hotkeyBindings.js#48-60.
- 设置层保护：setting 层 Del/Backspace 不拦截，保留输入框行为 @src/global/hotkeyRegistry.js#115-130.

> 快捷键可在设置页通过 hotkeyOverrides 覆盖，存储在 utools.dbStorage。

## 数据与配置
- 存储结构：本地 JSON 含 data（历史）、collects（收藏 ID）、collectData（收藏数据）；路径按设备 ID 区分，启动自动迁移/初始化 @src/global/initPlugin.js#53-190.
- 清理策略：maxsize 控制最大条数（历史）；maxage 控制最长天数（收藏不受影响）；设置来源 `readSetting` @src/global/initPlugin.js#233-268 @src/global/initPlugin.js#160-178.
- 来源信息：解析剪贴板文件路径/前台窗口标题存入 item.sourcePaths/sourceApp/sourceWindowTitle @src/global/initPlugin.js#488-635.
- 文件处理：文件/图片保留 originPaths，列表支持图片预览和原始路径展示 @src/global/initPlugin.js#144-159 @src/cpns/ClipItemList.vue#47-101.
- 自定义功能：类型/正则匹配 + redirect 命令，设置页维护，默认示例见 `setting.json` @src/data/setting.json#12-78.

## 构建与发布
1) 开发：`npm install`，`npm run serve`（dev server 8081，对应 plugin.json development.main）。
2) 生产：`npm run build` 生成 `dist/`（相对 publicPath），包含 plugin.json 与静态资源。
3) 打包：确保 `dist/plugin.json` 在根，压缩为 zip 并改名 `.upx` 后上传 uTools 后台。
4) 本地调试：uTools 开发者工具加载 `dist/` 或 `.upx`.

## 使用速览
1) 复制任意文本/图片/文件，历史自动入库（空文本忽略）。
2) ↑/↓ 选择，Enter 复制；Ctrl+Enter 复制并锁定；Ctrl+S 收藏.
3) 空格开启多选，批量复制/粘贴；含文件/图片自动合并处理。
4) Shift 预览图片；← 查看全文；→ 打开操作抽屉。
5) Shift+Del 打开清除对话框，数字键选清理范围。
6) 设置页可改存储、上限、快捷键、主页功能与自定义跳转。

## 已知限制
- 文件写回剪贴板暂未实现；文本/图片已支持 @src/global/initPlugin.js#667-685.

## 参考项目

### ClipboardManager
- **项目地址**: [https://github.com/ZiuChen/ClipboardManager](https://github.com/ZiuChen/ClipboardManager)
- **技术栈**: Vue 3 + Element Plus + uTools
- **核心功能**: 剪贴板历史管理、多类型支持（文本/图片/文件）
- **特点**: 基于 Vue 3 框架，使用 Element Plus UI 组件库，支持 uTools 插件生态
- **官网**: [https://ziuchen.gitee.io/project/ClipboardManager/](https://ziuchen.gitee.io/project/ClipboardManager/)
- **贡献指南**: [CONTRIBUTE.md](https://github.com/ZiuChen/ClipboardManager/blob/main/docs/CONTRIBUTE.md)

## 测试建议
- 正常：文本/图片/文件入库与去重；收藏/取消收藏；锁定与强制删除；多选合并粘贴；快捷键导航。
- 边界：空文本不入库；大图预览；maxsize/maxage 生效；快捷键覆盖。
- 安全：文件原路径展示正确，锁定项不被常规删除。
- 回归：监听降级后仍能入库；自定义功能匹配与排序。