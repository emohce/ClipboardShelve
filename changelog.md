# Changelog

**排序**：永远把**最新**一轮更新写在**最上面**（新的 `## 日期 — 标题` 区块插在紧接本说明之后，旧区块整体下推）。
**用户向发布摘要**（须同步维护）：见 [publishLog.md](publishLog.md)；写法与约束见 `vibe/rules/release.md`。

## 2026-06-17 — 富文件预览扩展 / PDF 首屏加速 / PPTX 低保真预览

### 变更摘要

- **PDF 首屏极速通道**：uTools 环境优先通过内置 Sharp 渲染 PDF 第 1 页，成功后立即展示首屏；PDF.js 后台获取页数并按需补页。Sharp 不可用或失败时保留 PDF.js 降级。
- **文档预览异步化**：TXT/MD/ADOC/CSV 改为 preload 异步首段读取，DOCX/XLSX 改为 preload 异步二进制读取，避免渲染进程同步读大文件阻塞首屏。
- **PPTX/PPSX 低保真预览**：新增 `jszip` 解析 `ppt/slides/slide*.xml` 文本节点，展示幻灯片编号、标题和正文摘要；`.ppt` 二进制格式继续降级为不可富预览。
- **运行期缓存**：PDF 第 1 页、PDF.js 模块、非 PDF 文档解析结果加入轻量缓存；切换/卸载时保留 object URL 释放、过期 token 防写回和 PDF document 销毁。
- **性能埋点**：PDF 路径在开发或显式调试开关下输出 `statMs/readMs/firstPageMs/backend/fallbackReason`，便于对比 Sharp 与 PDF.js 首屏耗时。

### 关键文件

| 路径 | 作用 |
|------|------|
| [src/cpns/FileRichPreview.vue](src/cpns/FileRichPreview.vue:1) | 富文件预览组件、PDF Sharp 优先路径、异步文档读取、PPTX 文本展示和缓存生命周期 |
| [src/utils/filePreview.mjs](src/utils/filePreview.mjs:1) | 文件类型识别、大小阈值、PPTX/PPSX 预览类型声明 |
| [scripts/utools-runtime-assets.mjs](scripts/utools-runtime-assets.mjs:1) | preload 暴露 PDF Sharp 渲染、文本首段读取、二进制读取 API |
| [test-file-preview.mjs](test-file-preview.mjs:1) | PDF.js 兼容、preload API、异步读取、PPTX 低保真路径回归测试 |
| [package.json](package.json:1) | 新增 `jszip` 依赖，`pdfjs-dist` 继续固定为 `2.6.347` |

### 风险 / 兼容性影响

- PPTX/PPSX 为低保真文本预览，不还原完整版式、图片、动画或母版样式。
- `.ppt`、`.doc`、`.xls` 等旧二进制 Office 格式仍不做内嵌预览，避免误判和大文件阻塞。
- 文本/CSV 首段读取可能截断超大文件内容，目标是快速首屏预览而非完整编辑器。
- uTools Sharp 缺失、PDF 解码失败或非 uTools 环境会自动回落 PDF.js；PDF.js 仍保留 `isEvalSupported: false` 安全兼容设置。
- `jszip` 增加一个按需加载 chunk，构建仍保留既有 chunk-size warning。

### 验证状态

- 已完成：`node test-preview-layout.mjs && node test-file-preview.mjs && node test-preview-scroll.mjs` 通过。
- 已完成：`pnpm run build` 通过，保留既有 PDF.js eval warning 与 chunk-size warning。
- 已完成：文档链接审计与 `git diff --check`。
- 待 uTools 手工复测：小 PDF、大 PDF、多页扫描 PDF、PPTX/PPSX、多次 Shift 重复预览、切换/退出后的旧页防写回和 object URL 释放。

### 知识沉淀状态

- 长期技术记忆：更新 [vibe/knowledge/technical-details.md](vibe/knowledge/technical-details.md:1) 与 [vibe/knowledge/MEMORY_INDEX.md](vibe/knowledge/MEMORY_INDEX.md:1)。
- 过程文档：更新 [vibe/specs/260616-rich-file-preview/01-spec.md](vibe/specs/260616-rich-file-preview/01-spec.md:1)、[vibe/specs/260616-rich-file-preview/02-plan.md](vibe/specs/260616-rich-file-preview/02-plan.md:1)、[vibe/specs/260616-rich-file-preview/04-verify.md](vibe/specs/260616-rich-file-preview/04-verify.md:1) 与 [vibe/specs/PROJECT_STATUS.md](vibe/specs/PROJECT_STATUS.md:1)。
- 新增 Error Memory：无。
- ADR：无。
- Glossary：无。

## 2026-06-14 — 设置页 UI 美化 / 快捷键配置体系重构 / 快捷键显示格式统一

### 变更摘要

#### 1. 设置页美化 & 快捷键绑定 UI 改造

- **设置页界面美化**：整体视觉升级，间距、字体、色彩规范统一。
- **快捷键绑定区 UI 重构**：列表布局、绑定标签、冲突提示样式重新设计，信息层次更清晰，操作更直观。

#### 2. 快捷键配置体系重构 / 层级优先级与穿透拦截优化

- **`LAYER_PRIORITY` 静态优先级表**：`hotkeyLayers.js` 新增全局层级优先级表（main=10 / setting=20 / clip-drawer·clear-dialog·full-data-overlay·tag-search=30~35 / tag-edit·pin-group-edit=40 / setting-shortcut-record·setting-when-edit=50），导出 `getLayerPriority()` 和 `getLayerPriorityStack(layers?)`，作为全局唯一层级判断来源。
- **`mainFocus` 语义修复**：原先 `mainFocus = !settingFocus`，任意弹层打开时 main 层仍命中。现改为：任意优先级高于 main 的层激活时 `mainFocus=false`，修复弹层打开期间主界面快捷键（`a-u`/`a-e` 等）误触发的问题。
- **dispatcher / preview / legacy 统一层级来源**：`hotkeyRegistry.js` 中 `dispatch`、`previewKeybindingResolution`、`resolveLegacyBinding` 全部改用 `getLayerPriorityStack(activeLayers)`，嵌套层（如 tag-edit 在 drawer 内）顺序正确。
- **移除 `overlayScore`**：`keybindingResolver.js` 删除通过字符串匹配 `when` 加权的 `overlayScore()`，层优先级统一由 `layerPriority` 的 `layerWeight` 决定，消除双重计分；非 active 层 binding 直接剔除出候选集。
- **setting 子层 wildcard 阻断**：`hotkeyBindings.js` 为 `setting-shortcut-record` / `setting-when-edit` 新增 `internal: true` 的 wildcard binding，绑定 `setting-overlay-block` feature；`Setting.vue` 通过 `registerFeature` / `unregisterFeature` 管理 handler，只阻止热键穿透，不破坏弹窗内输入控件默认行为。

#### 3. 快捷键显示格式统一 & 同步

- **简短多系统兼容样式**：快捷键展示统一为紧凑格式（`Ctrl+K` / `⌘K`），跨平台表示一致。
- **显示与存储同步**：配置页显示格式与底层存储的 shortcutId 格式保持双向同步，避免展示与实际绑定不一致。

### 关键文件

| 路径 | 作用 |
|------|------|
| [src/views/Setting.vue](src/views/Setting.vue:1) | 设置页 UI 美化、`registerFeature` / `unregisterFeature` 管理 `setting-overlay-block` |
| [src/global/hotkeyLayers.js](src/global/hotkeyLayers.js:1) | 新增 `LAYER_PRIORITY` 表、`getLayerPriority()`、`getLayerPriorityStack(layers?)` |
| [src/global/hotkeyContext.js](src/global/hotkeyContext.js:1) | `mainFocus` 修复：排除所有优先级 > main 的 active layer |
| [src/global/hotkeyRegistry.js](src/global/hotkeyRegistry.js:1) | dispatch / preview / legacy 统一使用 `getLayerPriorityStack(activeLayers)` |
| [src/global/keybindingResolver.js](src/global/keybindingResolver.js:1) | 删除 `overlayScore`，补充非 active 层过滤 |
| [src/global/hotkeyBindings.js](src/global/hotkeyBindings.js:1) | 新增 setting 子弹窗 wildcard 阻断（`internal: true`） |
| [src/global/commandDefaults.js](src/global/commandDefaults.js:1) | `setting-overlay-block` feature 不进入公开命令表 |
| [test-shortcut-command-system.js](test-shortcut-command-system.js:1) | 修复 4 处旧断言，新增 10+ 个层级优先级 / mainFocus / 穿透阻断回归用例 |
| [vibe/specs/260610-shortcuts-redesign/14YG2-zz-plan-层级判断统一.md](vibe/specs/260610-shortcuts-redesign/14YG2-zz-plan-层级判断统一.md) | 层级统一设计文档 |

### 风险 / 兼容性影响

- **`mainFocus` 语义变更**：用户自定义 `when: mainFocus` 的宏在任意弹层打开时不再触发，符合"主界面基础层"新定义。
- **未登记层默认优先级 0**：低于 main（10），不会错误压过主层；新增层需同步更新 `LAYER_PRIORITY` 表。
- **`overlayScore` 移除**：所有 dispatch / preview 路径已确保传入 `layerPriority`；外部直接调用 `resolveKeybinding` 不传该参数时 overlay binding 不再自动高权。
- 不改存储结构 / conflict 检测 / when 表达式语法。

### 验证状态

- 已完成：`node test-shortcut-command-system.js` 通过；静态代码检查。
- 待你本机：主界面无弹层时 `a-u`/`a-e` 翻页；组合编辑器内 `a-u` 只移动不穿透；抽屉/标签编辑打开时主界面快捷键静默；录制弹窗打开时方向键不触发 setting 页滚动。

### 知识沉淀状态

- 命中历史记录：`mainFocus` 根因已通过 spec 文档固化。
- 新增 Error Memory：无。
- ADR：无。
- Glossary：无。

## 2026-06-10 — 交互优化 / 置顶功能 / 置顶组合 / 热键刷新 / uTools 全局快捷键

### 变更摘要

- **收藏删除高亮恢复**：修正收藏 tab 强制删除后的高亮锚点逻辑，删除后落到删除区间后的第一个保留项，而非异常回到第一项。
- **标签编辑弹窗 Esc 拦截**：收藏条目 `F2` 打开标签/备注编辑弹窗后，`Esc` 只关闭当前弹窗，不穿透退出插件。
- **别名清空语义修正**：区分"没有显式别名"和"用户显式清空别名"，清空别名后不再回退显示收藏标签/备注。
- **单页滚动快捷键**：新增 `Alt+U` / `Alt+E` 单页上/下滚动，复用现有 `list-page-up/down` feature。
- **缓存首尾跳转**：新增 `Ctrl+Shift+Left` / `Ctrl+Shift+Right` 跳到当前已缓存列表首/尾，不主动全量加载。
- **置顶功能**：新增 `Alt+P` 置顶/取消置顶单个 item，置顶状态使用 `utools.dbStorage` 持久化，按当前 tab/search 筛选展示。
- **置顶组合**：新增 `Alt+G` 多选组合编辑，组合作为独立存储和列表合成项，支持拖拽排序、`Alt+U/E` 批量移动、`Enter` 整体粘贴。组合编辑器内 `Alt+G` 或 `Ctrl+Delete/Backspace` 清空组合；在列表中对组合项按 `Alt+G` 直接清空。
- **热键运行态刷新**：增加 `HOTKEY_BINDINGS_VERSION` 与 `HOTKEY_BINDINGS_UPDATED_EVENT`，在设置保存、窗口聚焦、HMR 时自动刷新热键绑定。
- **uTools 全局快捷键指令**：新增"粘贴置顶顶部项"和"循环粘贴置顶组合项"功能指令，支持用户绑定 `Ctrl+Shift+V` / `Command+Shift+V` 和 `Ctrl+Shift+P` / `Command+Shift+P`。

### 关键文件

| 路径 | 作用 |
|------|------|
| [src/views/Main.vue](src/views/Main.vue:1) | 删除恢复锚点修正、置顶项展示、组合合成项注入、uTools 指令处理 |
| [src/cpns/ClipItemList.vue](src/cpns/ClipItemList.vue:1) | 别名 map 结构化清空标记、置顶操作、组合粘贴 |
| [src/cpns/ClipItemRow.vue](src/cpns/ClipItemRow.vue:1) | 置顶图标展示 |
| [src/cpns/PinGroupEditor.vue](src/cpns/PinGroupEditor.vue:1) | 组合编辑浮窗、拖拽排序、批量移动 |
| [src/cpns/TagEditModal.vue](src/cpns/TagEditModal.vue:1) | Esc 拦截、tag-edit-close feature |
| [src/cpns/HotkeyProvider.vue](src/cpns/HotkeyProvider.vue:1) | 热键运行态刷新 |
| [src/global/hotkeyBindings.js](src/global/hotkeyBindings.js:1) | 新增快捷键绑定 |
| [src/global/hotkeyLabels.js](src/global/hotkeyLabels.js:1) | 新增快捷键文案 |
| [src/global/hotkeyRegistry.js](src/global/hotkeyRegistry.js:1) | Element Plus MessageBox Esc 拦截、热键版本记录 |
| [src/storage/pinnedItems.js](src/storage/pinnedItems.js:1) | 置顶状态存储、组合存储 |
| [src/storage/searchIndex.js](src/storage/searchIndex.js:1) | alias map 结构化值兼容 |
| [src/storage/clipboardRepository.js](src/storage/clipboardRepository.js:1) | alias map 结构化值兼容 |
| [src/utils/index.js](src/utils/index.js:1) | 别名清空标记、置顶操作 |
| [src/views/Setting.vue](src/views/Setting.vue:1) | 热键刷新触发、uTools 指令配置入口 |
| [scripts/utools-runtime-assets.mjs](scripts/utools-runtime-assets.mjs:1) | uTools 功能指令注册 |
| [src/style/cpns/clip-item-list.less](src/style/cpns/clip-item-list.less:1) | 置顶图标样式 |

### 风险 / 兼容性影响

- **删除恢复锚点**：收藏子 tab 筛选下删除最后一项时，允许当前筛选列表为空，不强行跳到其他子 tab。
- **别名清空语义**：清空别名不删除收藏标签/备注本身，只是禁止普通别名逻辑继续把它们当回退名。
- **置顶状态存储**：只保存置顶元数据，不复制 item 内容，不改 SQLite/JSON 历史主数据。
- **组合存储**：只保存 id/order/cursor，不复制 item 内容；删除历史项时清理组合引用，避免悬挂 id。
- **热键刷新**：只重设 bindings，不清空 feature handlers，不改 active layer，不影响搜索/多选状态。
- **uTools 指令**：只注册独立功能指令，由用户显式绑定快捷键；不替换系统默认粘贴键。

### 验证状态

- 已完成：`pnpm run build`、文档链接校验、代码检查。
- 待你本机：在 uTools 环境验证删除恢复、弹窗 Esc、别名清空、翻页快捷键、置顶功能、组合编辑、uTools 全局快捷键指令。

### 知识沉淀状态

- 命中历史记录：参考 `EM-2026-04-08-clipboard-nav-scroll-search-layout` 的 IME/搜索焦点约束，保留 composition 防护。
- 新增 Error Memory：无。
- ADR：无。
- Glossary：无。

## 2026-04-14 — 搜索覆盖扩展 / Enter 过滤一致性 / 检索偏好 ADR

### 变更摘要

- **搜索覆盖扩展**：搜索从仅正文扩展为“正文 + 别名 + 标签（分组）”联合匹配；图片类型仅匹配别名与标签，避免对 base64 内容做无意义扫描。
- **收藏分组纳入搜索**：收藏 tab（含子分组）下检索同样覆盖别名与标签，关键词命中规则与主列表保持一致。
- **Enter 过滤一致性修复**：搜索聚焦时 `Enter` 不再被过早短路，按当前过滤结果执行复制粘贴；IME 组合输入防护保留（`isComposing` / `Process`）。
- **知识沉淀**：新增 ADR 固化“筛选搜索偏好保持”与“Enter 必须遵循过滤规则”。

### 关键文件

| 路径 | 作用 |
|------|------|https://kal8gqdp2wn.feishu.cn/wiki/E6yGwydgpixvjAk4VNUcgPYLnee
| [src/views/Main.vue](src/views/Main.vue:1) | 搜索匹配逻辑升级；收藏与全部 tab 的图片搜索参与规则调整；搜索占位文案更新 |
| [src/utils/index.js](src/utils/index.js:1) | 新增别名解析与“正文+别名+标签”统一匹配 helper |
| [src/cpns/ClipItemList.vue](src/cpns/ClipItemList.vue:1) | `list-enter` / `list-ctrl-enter` / `list-save-by-alias` 去除搜索焦点短路 |
| `vibe/knowledge/adr/2026-04-14-search-preference-and-enter-filter-rule.md` | 新增长期决策记录 |
https://kal8gqdp2wn.feishu.cn/wiki/E6yGwydgpixvjAk4VNUcgPYLnee
### 风险 / 兼容性影响

- **匹配范围扩大**：部分历史关键词可能命中更多条目（例如标签或别名命中），需适应结果集增大。
- **Enter 行为调整**：搜索输入框聚焦时可直接执行当前高亮项粘贴，需确认与个人使用习惯一致。
- **图片检索策略**：图片仍不按正文（base64）检索，仅按别名/标签检索，保持性能与可解释性。

### 验证状态

- 已完成：编辑器 lints（本轮变更文件无报错）。
- 待你本机：在 uTools 环境验证“搜索命中别名/标签”“收藏子分组搜索”“搜索聚焦 Enter 粘贴”“IME 组字 Enter 不误触发”。

### 知识沉淀状态

- 命中历史记录：参考 `EM-2026-04-08-clipboard-nav-scroll-search-layout` (`vibe/knowledge/error-memory/2026-04-08-clipboard-nav-scroll-search-layout.md`) 的 IME/搜索焦点约束，保留 composition 防护。
- 新增 Error Memory：无。
- ADR：新增 `ADR-2026-04-14-search-preference-and-enter-filter-rule` (`vibe/knowledge/adr/2026-04-14-search-preference-and-enter-filter-rule.md`)。
- Glossary：无。

## 2026-04-10 — 图片预览布局优化 / 滚动方向修复

### 变更摘要 (重复标题: 2026-04-10 — 图片预览布局优化 / 滚动方向修复 #2)

- **图片预览布局策略优化**：小分辨率图片（原始尺寸小于可用区域 60%）不再强制按 3:1 比例填满，改用等比例缩放居中显示，避免过度放大。
- **滚动方向修复**：修正 shift+方向键的滚动方向映射，确保与视觉方向一致（上/下/左/右）。
- **滚动条样式优化**：改进图片预览滚动条样式，提升美观度和可用性。
- **工具栏提示增强**：新增图片预览工具栏快捷键提示，改善用户交互体验。

### 关键文件 (重复标题: 2026-04-10 — 图片预览布局优化 / 滚动方向修复 #2)

| 路径 | 作用 |
|------|------|
| [src/cpns/ClipItemList.vue](src/cpns/ClipItemList.vue:1) | 图片预览布局策略、滚动方向映射、工具栏提示 |
| [src/global/hotkeyRegistry.js](src/global/hotkeyRegistry.js:1) | 快捷键分发逻辑调整 |
| [src/style/cpns/clip-item-list.less](src/style/cpns/clip-item-list.less:1) | 滚动条样式优化 |

### 风险 / 兼容性影响 (重复标题: 2026-04-10 — 图片预览布局优化 / 滚动方向修复 #2)

- **布局策略变更**：小分辨率图片显示方式改变，从强制填满改为等比例缩放，可能影响部分用户习惯。
- **滚动方向变更**：shift+方向键的滚动方向已修正，需适应新的交互逻辑。

### 验证状态 (重复标题: 2026-04-10 — 图片预览布局优化 / 滚动方向修复 #2)

- 已完成：静态代码检查。
- 待你本机：在 uTools 环境验证小图片预览、shift+方向键滚动、滚动条样式。

### 知识沉淀状态 (重复标题: 2026-04-10 — 图片预览布局优化 / 滚动方向修复 #2)

- 命中历史记录：无直接命中。
- 新增 Error Memory：无。
- ADR：无。
- Glossary：无。

## 2026-04-10 — 选中项渲染延迟修复 / 别名粘贴防重复 / uTools运行时资产生成

### 变更摘要 (重复标题: 2026-04-10 — 选中项渲染延迟修复 / 别名粘贴防重复 / uTools运行时资产生成 #3)

- **选中项渲染延迟修复**：修复多选模式下选中item进行加锁/别名编辑/收藏操作时，图标等渲染效果不能立即更新的问题。修改 `isItemCollected` 和 `getItemAlias` 函数优先检查item对象属性，操作后直接修改showList中对应item的属性而非selectItemList。
- **别名粘贴防重复**：别名粘贴增加写盘校验，改别名/删条目时自动清理孤儿文件，避免磁盘堆积。
- **快捷键对话框隔离**：优化弹窗输入态与主层Enter/Escape快捷键冲突，防止Esc误退插件。
- **uTools运行时资产生成**：新增 `scripts/utools-runtime-assets.mjs` 统一生成plugin.json/preload.js/listener.js，`package.json` serve前置执行prepare:utools确保dist运行时资产齐全，vite.config.js closeBundle阶段调用生成函数替代public目录复制。

### 关键文件 (重复标题: 2026-04-10 — 选中项渲染延迟修复 / 别名粘贴防重复 / uTools运行时资产生成 #3)

| 路径 | 作用 |
|------|------|
| [src/cpns/ClipItemList.vue](src/cpns/ClipItemList.vue:1) | `isItemCollected`/`getItemAlias`函数优化、操作后直接修改showList |
| [src/utils/index.js](src/utils/index.js:1) | 别名写盘校验、孤儿文件清理 |
| [src/global/hotkeyRegistry.js](src/global/hotkeyRegistry.js:1) | 弹窗态快捷键隔离 |
| [scripts/utools-runtime-assets.mjs](scripts/utools-runtime-assets.mjs:1) | uTools运行时资产统一生成 |
| [scripts/prepare-utools-runtime.mjs](scripts/prepare-utools-runtime.mjs:1) | 开发启动前置生成入口 |
| [vite.config.js](vite.config.js:1) | closeBundle阶段生成运行时资产 |
| [package.json](package.json:1) | serve前置执行prepare:utools |

### 风险 / 兼容性影响 (重复标题: 2026-04-10 — 选中项渲染延迟修复 / 别名粘贴防重复 / uTools运行时资产生成 #3)

- **渲染数据源变更**：操作直接修改showList而非selectItemList，需确保数据流一致性。
- **别名文件清理**：首次使用别名功能会在userData下创建文件，需确保目录可写。
- **运行时资产生成**：dev模式必须先执行prepare:utools，否则dist/preload.js缺失会导致uTools加载失败。
- **快捷键隔离**：弹窗态Enter/Escape行为变更，需适应新的交互逻辑。

### 验证状态 (重复标题: 2026-04-10 — 选中项渲染延迟修复 / 别名粘贴防重复 / uTools运行时资产生成 #3)

- 已完成：静态代码检查、编辑器lints（本轮改动文件无报错）。
- 待你本机：在uTools环境验证多选模式下操作立即更新、别名粘贴防重复、弹窗快捷键隔离、dev模式启动流程。

### 知识沉淀状态 (重复标题: 2026-04-10 — 选中项渲染延迟修复 / 别名粘贴防重复 / uTools运行时资产生成 #3)

- 命中历史记录：无直接命中。
- 新增 Error Memory：
  - `EM-2026-04-10-selected-item-render-update-delay.md` (`vibe/knowledge/error-memory/2026-04-10-selected-item-render-update-delay.md`)
  - `EM-2026-04-10-utools-runtime-assets.md` (`vibe/knowledge/error-memory/2026-04-10-utools-runtime-assets.md`)
- ADR：无。
- Glossary：无。

## 2026-04-10 — 003-quick-item-operation（别名粘贴生命周期 / 图片双轨支持 / 快捷键家族识别）

### 变更摘要 (重复标题: 2026-04-10 — 003-quick-item-operation（别名粘贴生命周期 / 图片双轨支持 / 快捷键家族识别） #4)

- **别名材料生命周期**：`userData` 下按条目持久化别名文件，内容指纹复用；单文件别名粘贴增加写盘校验，改别名/删条目时自动清理孤儿文件。
- **图片别名双轨支持**：纯图片别名采用双轨策略——优先使用文件对象粘贴，失败时回退到图片粘贴，确保别名功能对图片类型可用。
- **快捷键家族识别**：`HotkeyTreeViewShortcut.vue` 新增 `isCompleteOneToNineFamily` 函数，识别完整的 1-9 快捷键家族（`list-quick-copy`、`list-drawer-sub`、`drawer-select`），在设置页展示为范围摘要标签。
- **快捷键标签文案**：`hotkeyLabels.js` 新增三个 range-summary 标签（`list-quick-copy-range-summary`、`list-drawer-sub-range-summary`、`drawer-select-range-summary`），明确 1-9 快捷键的完整范围。
- **用户文档更新**：`docs/用户简明说明.md` 重构快捷键说明为分组结构，补充 `F2` 双分支说明（已收藏条目为标签/备注编辑，未收藏条目为别名新增/更新），更新抽屉序号执行键位为 `ctrl+alt+1..9`。
- **术语表更新**：`glossary.md` 新增 `F2` / `list-tag-edit` 双分支术语说明，明确按 `window.db.isCollected(item.id)` 分支逻辑。
- **错误记忆**：新增 `EM-2026-04-10-alias-material-lifecycle.md` (`vibe/knowledge/error-memory/2026-04-10-alias-material-lifecycle.md`)，记录别名材料生命周期与清理策略。

### 关键文件 (重复标题: 2026-04-10 — 003-quick-item-operation（别名粘贴生命周期 / 图片双轨支持 / 快捷键家族识别） #4)

| 路径 | 作用 |
|------|------|
| [src/utils/index.js](src/utils/index.js:1) | 别名文件持久化、内容指纹、写盘校验、图片双轨粘贴 |
| [src/cpns/ClipItemList.vue](src/cpns/ClipItemList.vue:1) | 别名粘贴调用、改别名/删条目清理逻辑 |
| [src/global/initPlugin.js](src/global/initPlugin.js:1) | `userData` 目录初始化 |
| [src/cpns/HotkeyTreeViewShortcut.vue](src/cpns/HotkeyTreeViewShortcut.vue:1) | 1-9 快捷键家族识别 |
| [src/global/hotkeyLabels.js](src/global/hotkeyLabels.js:1) | range-summary 标签文案 |
| [docs/用户简明说明.md](docs/用户简明说明.md) | 用户快捷键说明重构 |
| `vibe/knowledge/glossary.md` | F2 双分支术语 |
| `vibe/knowledge/error-memory/2026-04-10-alias-material-lifecycle.md` | 别名材料生命周期复盘 |

### 风险 / 兼容性影响 (重复标题: 2026-04-10 — 003-quick-item-operation（别名粘贴生命周期 / 图片双轨支持 / 快捷键家族识别） #4)

- **别名文件持久化**：首次使用别名功能会在 `userData` 下创建文件，需确保目录可写。
- **图片双轨粘贴**：文件对象优先策略可能改变图片别名的粘贴行为，但失败时有回退机制保证可用性。
- **快捷键家族识别**：仅影响设置页展示标签，不影响快捷键实际绑定逻辑。
- **用户文档重构**：快捷键说明结构变化，用户需适应新文档格式。

### 验证状态 (重复标题: 2026-04-10 — 003-quick-item-operation（别名粘贴生命周期 / 图片双轨支持 / 快捷键家族识别） #4)

- 已完成：静态代码检查、编辑器 lints（本轮改动文件无报错）。
- 待你本机：在 uTools 环境按 `specs/003-quick-item-operation/quickstart.md` 执行别名粘贴、图片别名、快捷键家族展示等场景验证。

### 知识沉淀状态 (重复标题: 2026-04-10 — 003-quick-item-operation（别名粘贴生命周期 / 图片双轨支持 / 快捷键家族识别） #4)

- 命中历史记录：无直接命中。
- 新增 Error Memory：`EM-2026-04-10-alias-material-lifecycle.md` (`vibe/knowledge/error-memory/2026-04-10-alias-material-lifecycle.md`)。
- ADR：无。
- Glossary：新增 `F2` / `list-tag-edit` 双分支术语。

## 2026-04-09 — 003-quick-item-operation（单条目别名 / 抽屉序号键迁移 / 别名保存触发）

### 变更摘要 (重复标题: 2026-04-09 — 003-quick-item-operation（单条目别名 / 抽屉序号键迁移 / 别名保存触发） #5)

- `F2`（`list-tag-edit`）从“仅收藏编辑”扩展为“单条目别名新增/更新入口”：收藏条目仍走原弹层；非收藏条目支持轻量别名输入并落到本地别名映射。
- 抽屉序号快捷执行从 `ctrl+shift+1..9` 迁移为 `ctrl+alt+1..9`，并在标签文案中明确新键位；抽屉序号越界时增加提示，防止误触发。
- 新增 `shift+Enter`（`list-save-by-alias`）：单文件且有别名时，复制临时重命名文件并粘贴；其他类型保持原复制粘贴路径。
- `ClipItemList` 增加别名解析优先级（本地别名映射 -> `remark` -> `alias` -> 首个 `tags`），并补充无条目/无别名提示。

### 关键文件 (重复标题: 2026-04-09 — 003-quick-item-operation（单条目别名 / 抽屉序号键迁移 / 别名保存触发） #5)

| 路径 | 作用 |
|------|------|
| [src/cpns/ClipItemList.vue](src/cpns/ClipItemList.vue:1) | `F2` 别名逻辑、`list-save-by-alias`、抽屉序号越界保护 |
| [src/global/hotkeyBindings.js](src/global/hotkeyBindings.js:1) | 新增 `shift+Enter`，迁移 `ctrl+alt+1..9` |
| [src/global/hotkeyLabels.js](src/global/hotkeyLabels.js:1) | 别名与新快捷键展示文案 |
| [src/utils/index.js](src/utils/index.js:1) | 单文件按别名重命名后粘贴能力 |
| [src/hooks/useClipOperate.js](src/hooks/useClipOperate.js:1) | 别名统一判定 helper |
| [docs/用户简明说明.md](docs/用户简明说明.md) | 用户可见快捷键说明更新 |

### 风险 / 兼容性影响 (重复标题: 2026-04-09 — 003-quick-item-operation（单条目别名 / 抽屉序号键迁移 / 别名保存触发） #5)

- 快捷键迁移会影响旧习惯（`ctrl+shift+num` -> `ctrl+alt+num`），需要用户适配。
- 单文件别名粘贴通过临时目录生成重命名副本，若临时文件路径不可写会回退默认粘贴并提示。
- 非收藏条目的别名当前走本地映射，不影响收藏弹层的数据结构。

### 验证状态 (重复标题: 2026-04-09 — 003-quick-item-operation（单条目别名 / 抽屉序号键迁移 / 别名保存触发） #5)

- 已完成：静态代码检查、编辑器 lints（本轮改动文件无报错）。
- 待你本机：在 uTools 环境按 `specs/003-quick-item-operation/quickstart.md` 执行三组手工场景验证。

### 知识沉淀状态 (重复标题: 2026-04-09 — 003-quick-item-operation（单条目别名 / 抽屉序号键迁移 / 别名保存触发） #5)

- 命中历史记录：无直接命中。
- 新增 Error Memory / ADR / Glossary：无。

## 2026-04-08 — 001-delete-search-nav-ux（删除 / 搜索 / IME / 列表导航 / 顶栏间距）

### 变更摘要 (重复标题: 2026-04-08 — 001-delete-search-nav-ux（删除 / 搜索 / IME / 列表导航 / 顶栏间距） #6)

- **Speckit**：新增特性目录 [`specs/001-delete-search-nav-ux/`](specs/001-delete-search-nav-ux/)（`spec.md`、`plan.md`、`research.md`、`data-model.md`、`contracts/`、`quickstart.md`、`tasks.md`、`checklists/requirements.md`）；分支 `001-delete-search-nav-ux`。
- **删除与持久化**：`removeItemViaId` 成功后改为立即 `updateDataBaseLocal(..., { immediate: true })`，降低防抖窗口内丢盘、重进「像回滚」的风险（对齐 EM-2026-04-06-json-db-debounce-persist 思路）。
- **多选删除高亮**：`preferItemId` 仅在未删除的保留项中选取邻近 id，避免锚到待删项导致恢复异常。
- **搜索与 IME**：`Main.vue` 搜索已展开且在 `.clip-search` 内输入时不再 `window.focus()`；`ClipSearch` 组合输入与 `onEmpty` / reveal-guard 协调；`hotkeyRegistry` 在 `isComposing` 时不分发快捷键；`list-enter` / `list-ctrl-enter` 在搜索框聚焦或 `Process` 时短路。
- **列表键盘滚动**：近顶上移用小索引 `edge-align` + `end`；首项顶对齐配合 **`scrollTop = 0`**（避免 WebView 下 `scrollIntoView(block:start)` 误滚祖先导致首条「消失」）；`center-preferred` 对首尾索引优先 `start`/`end`。
- **主界面布局**：收紧 [`Main.vue`](src/views/Main.vue:1) `.clip-break` / `.clip-break--with-sub`（收藏 + 子标签）及空状态 `min-height`，减少固定顶栏与列表间无效大块空白。
- **知识库**：新增 `EM-2026-04-08-clipboard-nav-scroll-search-layout` (`vibe/knowledge/error-memory/2026-04-08-clipboard-nav-scroll-search-layout.md`)，更新 [vibe/knowledge/error-memory/README.md](vibe/knowledge/error-memory/README.md) 索引；`spec` / `research` / `plan` / `quickstart` 同步本轮约定与验证说明。

### 关键文件 (重复标题: 2026-04-08 — 001-delete-search-nav-ux（删除 / 搜索 / IME / 列表导航 / 顶栏间距） #6)

| 路径 | 作用 |
|------|------|
| [src/global/initPlugin.js](src/global/initPlugin.js:1) | 删除后立即落盘 |
| [src/global/hotkeyRegistry.js](src/global/hotkeyRegistry.js:1) | `isComposing` 早退 |
| [src/views/Main.vue](src/views/Main.vue:1) | 搜索 `keydown` 焦点；`.clip-break` 高度 |
| [src/cpns/ClipSearch.vue](src/cpns/ClipSearch.vue:1) | IME / `onEmpty` / `compositionend` |
| [src/cpns/ClipItemList.vue](src/cpns/ClipItemList.vue:1) | 删除 anchor、`list-nav-up/down`、`list-enter` |
| [src/hooks/useVirtualListScroll.js](src/hooks/useVirtualListScroll.js:1) | 首项 `scrollTop=0`；首尾 `center-preferred` 分支 |
| [specs/001-delete-search-nav-ux/](specs/001-delete-search-nav-ux/) | 规格、计划、任务与验证 |
| `vibe/knowledge/error-memory/2026-04-08-clipboard-nav-scroll-search-layout.md` | 本轮交互与布局复盘 |
| [vibe/knowledge/error-memory/README.md](vibe/knowledge/error-memory/README.md) | EM 索引 |

### 风险 / 兼容性影响 (重复标题: 2026-04-08 — 001-delete-search-nav-ux（删除 / 搜索 / IME / 列表导航 / 顶栏间距） #6)

- **删除立即写盘**：单次删除 IO 略增；批量删除仍为多次 `immediate`，极端大数据量时可再评估批量策略。
- **composition 全局短路**：组字期间不按热键，需符合中文输入预期。
- **`.clip-break` 高度**：若收藏子标签极多、窄窗多行折行，可能出现顶栏与列表轻度重叠或仍偏大缝，需按实机微调像素。
- **构建验证**：部分环境未跑通 `pnpm run build`，合并前建议在本地执行 [`pnpm run build`](package.json:1) 与 [`specs/001-delete-search-nav-ux/quickstart.md`](specs/001-delete-search-nav-ux/quickstart.md) 手工用例。

### 验证状态 (重复标题: 2026-04-08 — 001-delete-search-nav-ux（删除 / 搜索 / IME / 列表导航 / 顶栏间距） #6)

- **已执行**：静态阅读与逻辑串联；`read_lints` 无报错文件。
- **未执行 / 待你本机**：uTools 内全量 quickstart（含 SC-001～004、顶栏间距 §6）；`pnpm run build`。

### 知识沉淀状态 (重复标题: 2026-04-08 — 001-delete-search-nav-ux（删除 / 搜索 / IME / 列表导航 / 顶栏间距） #6)

- **命中历史记录**：采用 `EM-2026-04-06-json-db-debounce-persist` (`vibe/knowledge/error-memory/2026-04-06-json-db-debounce-persist.md`)、`EM-2026-04-06-scroll-path` (`vibe/knowledge/error-memory/2026-04-06-scroll-path.md`) 中的已确认通路思路。
- **新增 Error Memory**：`EM-2026-04-08-clipboard-nav-scroll-search-layout` (`vibe/knowledge/error-memory/2026-04-08-clipboard-nav-scroll-search-layout.md`)；索引已更新。
- **ADR**：无。
- **Glossary**：无。
- **其他**：Speckit 的 `update-agent-context` 可能曾向 [AGENTS.md](AGENTS.md) 追加特性栈摘要行（以文件 diff 为准）。

---
