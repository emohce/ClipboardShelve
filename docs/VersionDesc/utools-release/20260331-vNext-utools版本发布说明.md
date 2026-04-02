# EzClipboard uTools 版本发布说明

创建日期：2026-03-31
适用仓库：`/Users/gdkmjd/work/czz/EzClipboard`
发布范围：当前 `main` 分支相对 `origin/main` 未 push 的全部代码
发布标识：`vNext`（仓库内暂无显式版本号字段，本说明按待发布版本记录）

## 1. 本次核验结论

- 当前分支相对远端 `origin/main` 超前 6 个提交。
- 当前工作区还存在未提交改动：
  - 已修改：`src/cpns/ClipSearch.vue`
  - 已修改：`src/style/cpns/clip-search.less`
  - 已修改：`src/style/cpns/clip-switch.less`
  - 已修改：`src/views/Main.vue`
  - 未跟踪：`.codemark/`
  - 未跟踪：`docs/todo/260331-codex-current-changes-summary.md`
  - 未跟踪：`docs/VersionDesc/utools-release/20260331-vNext-utools版本发布说明.md`
- 已完成生产构建核验：`pnpm run build` 执行成功。
- `dist/plugin.json` 已正常生成，可用于后续打包 `.upx`。
- 当前未发现阻塞发布的编译错误。
- 存在 3 条 webpack 体积告警，但不影响本次构建产出。

## 2. 本次未 push 提交范围

按提交时间从早到晚：

1. `7b41856` `docs(doc): 更新包管理器为pnpm并补充配置`
2. `888f07f` `docs(doc): 新增版本架构基线和迭代说明文档`
3. `57b78c9` `mod-doc: 重构docs目录`
4. `b598c48` `refactor(ng-admin): 重构设置页面和主视图样式系统`
5. `f96fddb` `add(config): 添加开发服务启动脚本`
6. `354281a` `refactor(ng-admin): 优化设置页面交互和预览配置`

补充说明：

- 上述 6 个提交是当前相对 `origin/main` 已形成的未 push 提交。
- 除这 6 个提交外，当前工作区还有未提交源码改动，发布前建议一并确认是否纳入本次发版。

## 3. 面向 uTools 发布的主要更新

### 3.1 设置页与交互体验

- 设置页标签结构扩展为：
  - 存储
  - 快捷键
  - 功能
  - 功能配置
- 快捷键列表支持关键词搜索。
- 快捷键列表支持作用域筛选（全部 / 主界面 / 弹窗层）。
- 功能列表支持搜索过滤。
- 功能列表在过滤状态下禁止拖拽排序，避免误排。
- 新增统一说明提示组件 `HelpHint`，降低设置项理解成本。

### 3.2 预览能力增强

- 新增“鼠标悬浮预览”配置项。
- 支持开启/关闭悬浮预览。
- 支持配置悬浮预览触发延迟时间。
- 设置保存后当前窗口立即同步，无需重启插件生效。
- 关闭悬浮预览后，会主动清理相关预览定时器和预览状态。

### 3.3 快捷键与输入焦点处理

- 快捷键树展示样式重做，可读性更强。
- macOS 平台快捷键显示做了平台化格式化。
- 设置页输入控件聚焦时，不再继续把按键分发给主界面热键，降低误触发风险。
- 标签搜索弹窗的键盘事件处理增强，方向键 / Enter / Esc 的行为更明确，并补充了 `metaKey` 兼容。
- 主界面新增 `Ctrl+Shift+U`，可快速触发或取消“有锁条件搜索”，并保持焦点继续输入文字关键字。

### 3.4 主界面与视觉样式

- 主界面顶部操作文案由图标为主调整为文字为主，入口更直接。
- 空状态、抽屉、弹窗、按钮、卡片、阴影、间距、圆角等样式统一。
- 样式系统从散落的 Less 变量进一步收敛到 CSS 变量，便于主题统一与后续维护。
- 部分组件补充响应式适配，提升窄窗口场景可用性。
- 主界面顶部 tab 区与搜索区布局进一步压缩，搜索区可用宽度提升；锁筛选改为 `全部 / 有锁` 两态，便于快捷键切换。

### 3.5 工程与开发流程

- 包管理方式统一为 `pnpm`，`package.json` 已声明 `packageManager`。
- README 中开发与构建命令已同步切换为 `pnpm`。
- 新增 `scripts/dev-serve.sh`，支持在未预加载 Node 环境的终端中自动加载 `nvm`、切换 Node 24 并启动开发服务。
- `ResizeObserver` 相关噪声错误拦截逻辑增强，减少开发态 overlay 干扰。

### 3.6 文档沉淀

- 新增版本基线文档与版本说明目录规范。
- `docs/` 目录结构完成一次整理，历史过程文档归档到 `docs/todo/` 等子目录。

## 4. 关键改动文件

核心功能与交互：

- `src/views/Setting.vue`
- `src/views/Main.vue`
- `src/cpns/ClipItemList.vue`
- `src/cpns/TagSearchModal.vue`
- `src/cpns/HelpHint.vue`
- `src/cpns/HotkeyTreeView.vue`
- `src/cpns/HotkeyTreeViewLayer.vue`
- `src/cpns/HotkeyTreeViewShortcut.vue`
- `src/cpns/SettingPagedTable.vue`

设置与全局逻辑：

- `src/global/readSetting.js`
- `src/global/restoreSetting.js`
- `src/global/initPlugin.js`
- `src/global/hotkeyRegistry.js`
- `src/global/hotkeyLabels.js`
- `src/global/shortcutKey.js`
- `src/global/registerElement.js`

工程配置与文档：

- `package.json`
- `README.md`
- `vue.config.js`
- `scripts/dev-serve.sh`
- `docs/VersionDesc/README.md`
- `docs/VersionDesc/20260331-v0-当前版本架构与迭代基线说明.md`

## 5. 风险与兼容性说明

- 本次变更以设置页和主界面交互重构为主，UI 回归范围较大，应重点回归主界面按钮操作、设置页保存、快捷键查看、标签搜索弹窗。
- 设置数据结构已从部分点语法 key 转向嵌套对象，代码中已补兼容与默认值初始化，但历史数据仍建议实机回归。
- 悬浮预览改为可配置并支持热更新，需重点验证：
  - 开关关闭时不再触发悬浮预览
  - 延迟值修改后立即生效
  - Shift 长按预览不受影响
- 构建存在 bundle 体积告警：
  - `dist/js/chunk-vendors.e4dfeb3c.js` 约 554 KiB
  - `dist/css/app.96899258.css` 约 316 KiB
  当前不阻塞发布，但后续如继续扩展界面能力，建议关注首屏体积。
- 仓库中未见 `public/plugin.json` 版本号字段，本次发布如需上传 uTools 市场，需按实际发版流程补齐外部版本标识。

## 6. 本次验证结果

### 6.1 已完成

- `git status --short --branch`
- `git log --oneline origin/main..HEAD`
- `git diff --stat origin/main..HEAD`
- 关键功能文件差异审阅
- `pnpm run build`
- 校验 `dist/plugin.json` 存在

### 6.2 构建结果

- 构建通过。
- 未出现阻塞性报错。
- 存在 webpack 体积告警，但构建产物完整。

### 6.3 未完成项

- 未进行真实 uTools 客户端内的手工回归。
- 未执行自动化测试；仓库当前也未配置自动化测试框架。
- 未验证 Windows / Linux / macOS 三端实际插件行为，仅完成当前环境下的静态核验与构建核验。

## 7. 建议的发布摘要

可直接用于 uTools 发布后台的简版说明：

> 本次更新重点优化了设置页与主界面体验，新增快捷键搜索与作用域筛选、功能列表搜索、鼠标悬浮预览配置与即时生效能力，并统一了多处界面样式与说明提示。同时补充了 pnpm 开发配置与版本基线文档，提升后续维护与迭代效率。

## 8. 发布前建议回归项

- 设置页保存后重新打开，确认存储路径、历史条数、保存时间、自定义功能、悬浮预览配置均被正确保留。
- 主界面搜索、多选、清空、设置入口、收藏切换行为正常。
- 标签搜索弹窗支持方向键、Enter、Esc 操作，且不会把按键冒泡到主界面。
- 开启与关闭悬浮预览后，图片和长文本预览行为符合预期。
- 构建后打包 `dist/`，确认 `plugin.json`、`preload.js`、`listener.js` 等入口文件在包内完整。
