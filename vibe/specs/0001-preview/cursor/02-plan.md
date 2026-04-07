# Plan: 剪贴板预览效果优化（图片 / 文字 / Shift 锁定）

## 1. 变更目标

- 对齐 [`01-spec.md`](01-spec.md)：图片预览在遮罩内垂直居中、窄图在宽度方向合理放大并可滚动、高图以宽铺满为基准用 Shift+方向键滚动（非缩放）；文字预览单行约 90% 宽、垂直居中、省略号不换行，多行可 Shift+上下滚动；Shift 长按预览期间鼠标划过列表不切换预览目标，松开后恢复。
- 对齐 `01-spec` 中补充：**横向溢出时**可用 **Shift+左/右** 在图片预览内容区横向滚动（当前热键与处理函数均未覆盖）。

## 2. 现状与根因

- **图片布局**：[`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue) 中 `.image-preview-content` 使用 `display: flex`、`align-items: flex-start`（约 2323–2327 行 scoped 样式），滚动容器内图片贴顶，矮图视觉上不居中。
- **窄图未「扩宽」**：`showImagePreview` 为 `<img>` 设置 `maxWidth: availableWidth`、`width: height: auto`（约 285–293 行），仅限制上限不放大；小于视区宽度的图保持原始显示宽度，与「宽度小则扩至可用宽度（再滚动）」不一致。
- **横向滚动快捷键**：`handleImagePreviewKeydown` 仅处理 `Shift + ArrowUp/Down`（约 352–373 行），无 `ArrowLeft/ArrowRight`；[`src/global/hotkeyBindings.js`](../../../src/global/hotkeyBindings.js) 中无 `shift+ArrowLeft/Right` 绑定。
- **全局 Shift+上下与图片预览**：`shift+ArrowUp/Down` 绑定到 `text-preview-scroll-up/down`（`hotkeyBindings.js` 254–255 行），处理器只操作 `.text-preview-modal`（约 1833–1851 行）。图片预览依赖弹层 `@keydown`；若焦点或分发顺序导致弹层未先消费按键，存在与列表行为冲突的风险，应在同一套「预览滚动」逻辑中**显式**处理 `imagePreview.show`（见设计方案）。
- **文字预览**：`showTextPreview` 与 scoped 样式为 `white-space: pre-wrap`、`word-break: break-word`（约 753–771、2313–2319 行），与单行「不换行 + 省略」冲突；需按单行/多行分支。
- **Shift 预览时鼠标切换条目**：`watch(() => activeIndex, …)` 在 `keyboardTriggeredPreview` 为真时调用 `triggerKeyboardPreview()`（约 1604–1616 行），会按当前 `activeIndex` 刷新预览；同时 `handleMouseOver` 在非多选且未挂起时**始终** `activeIndex = index`（约 1214–1221 行）。按住 Shift 预览时鼠标移入其他行会改 `activeIndex`，从而触发 watch 切换预览，与 spec 冲突。根因是**未在键盘触发的预览持续期间抑制由鼠标引起的 `activeIndex` 更新**。

## 3. 设计方案

### 3.1 Shift 预览锁定（鼠标不切换）

- 在 `handleMouseOver` 中，当 `keyboardTriggeredPreview.value === true` 时，**不执行**将 `activeIndex` 设为当前行的逻辑（保留多选、挂起等既有分支语义；多选模式下原逻辑已不随鼠标改 `activeIndex`，需确认与现有一致）。
- **保留** `watch(activeIndex)` 内对 `keyboardTriggeredPreview` 的 `triggerKeyboardPreview`：用于 **Shift 按住期间用户用键盘**（如上下键）切换列表项时仍刷新预览；仅切断鼠标路径对 `activeIndex` 的写入。
- 不新增全局状态机；必要时用注释标明「仅阻断鼠标驱动的 activeIndex 变更，不阻断键盘导航」。

### 3.2 图片：居中、窄图扩宽、滚动与 Shift+方向键

- **垂直居中**：在 `.image-preview-content` 仍为可滚动 flex 容器的前提下，将「仅纵向可滚动且内容高度小于视口」时的对齐改为垂直居中（常见做法：`align-items: center` 配合内部包裹层 `min-height: min(100%, …)` 或等价结构，避免高图无法从顶部滚动的回归）。若单一 flex 属性无法同时满足「矮图居中 + 高图从顶向下滚动」，采用**内层包裹**（wrapper）区分：内容高度 ≤ 容器时居中，超出时顶部对齐可滚动（实现细节在 tasks 阶段落地，此处只定方向）。
- **窄图扩宽**：在 `showImagePreview` 或 `@load` 中根据 `naturalWidth/naturalHeight` 与 `availableWidth` 计算展示宽度：在不变形前提下将显示宽度提升至不超过 `availableWidth`（例如 `min(naturalWidth, availableWidth)` 与按比例缩放高度，或保持 `object-fit: contain` 下宽拉满）；与现有「以宽度为准」注释一致，避免改变 PNG/JPEG 像素以外的语义（仍是 CSS 尺寸，非 uTools 缩放 API）。
- **Shift+上下/左右滚动**：  
  - 在 `handleImagePreviewKeydown` 中增加 `ArrowLeft`/`ArrowRight` 与 Shift 组合，对 `imagePreviewContentRef` 做 `scrollLeft` 步进（与现有 `scrollTop` 步进一致的量级可配置同一常量）。  
  - 在 [`hotkeyBindings.js`](../../../src/global/hotkeyBindings.js) 增加 `shift+ArrowLeft`、`shift+ArrowRight` 绑定，并在 `registerListHotkeyFeatures` 内注册对应 feature，行为为：仅当 `imagePreview.show` 时横向滚动并 `return true`，否则 `return false`，避免与 Tab 切换等冲突。  
  - **统一 Shift+上下**：将 `text-preview-scroll-up/down` 的处理器扩展为：若 `imagePreview.show`，则滚动图片容器并 `return true`；否则保持现有文字预览滚动逻辑。这样无论焦点在何处，全局热键与 spec 一致。若与 `handleImagePreviewKeydown` 重复消费，需二选一：**以 registry 为准**时在弹层上不再重复处理，或 **以弹层为准**时在 feature 内检测目标并跳过；实现时保证**只消费一次**（在 `04-verify.md` 记录）。

### 3.3 文字：单行 vs 多行

- **判定**（与 `01-spec` §8.1 对齐，默认实现假设）：在 `isLongText(item)` 为真且打开 `showTextPreview` 时，若 `!item.data.includes('\n')`（或 `split('\n').length === 1`）视为 **单行模式**：容器约 90% 视窗宽、flex/grid 垂直居中、`white-space: nowrap`、`text-overflow: ellipsis`、`overflow: hidden`，去掉 `pre-wrap`/`break-word`。  
- **多行**：保留可滚动块，`Shift+上下` 继续走 `text-preview-scroll-*`（并确保与图片 case 互斥：同一时间仅一种预览显示）。

### 3.4 外部窗口 `openExternalPreview`

- 本计划**不修改** `openExternalPreview` 注入的 HTML/CSS（[`ClipItemList.vue`](../../../src/cpns/ClipItemList.vue) 约 385–577 行）。若运行时仍调用该路径，行为保持原样；与 [`01-spec.md`](01-spec.md) §8.3 一致，以插件内 Teleport 预览为主。

## 4. 受影响文件

| 文件 | 改动意图 |
|------|----------|
| [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue) | `handleMouseOver` 条件；图片样式与 load 后尺寸；`handleImagePreviewKeydown` 四方向；`showTextPreview` 单行/多行分支；扩展 `text-preview-scroll-*` 注册逻辑；必要时模板增加包裹层 ref |
| [`src/global/hotkeyBindings.js`](../../../src/global/hotkeyBindings.js) | 新增 `shift+ArrowLeft`、`shift+ArrowRight` 与 feature 列表 |
| [`src/global/hotkeyLabels.js`](../../../src/global/hotkeyLabels.js) | 为新 feature 增加用户可见说明（若项目要求与现有 `text-preview` 标签一致） |
| [`specs/0001-preview/cursor/04-verify.md`](04-verify.md) | 实现阶段按 [`vibe/ai-rules/05-verification-checklist.md`](../../../vibe/ai-rules/05-verification-checklist.md) 记录验证项 |

不涉及 [`public/plugin.json`](../../../public/plugin.json)、preload、listener，除非验证中发现热键层冲突。

## 5. 数据与状态变更

- 无持久化变更。  
- 运行时：沿用 `keyboardTriggeredPreview`、`imagePreview`、`textPreview`；可选增加「当前文字是否为单行展示」的派生标志（局部 `computed` 或 `showTextPreview` 内变量），不写入 db。

## 6. 接口与交互变更

- **用户可见**：Shift 长按预览时，鼠标在列表上移动不再切换高亮项/预览内容；键盘导航仍可切换。  
- **快捷键**：新增 Shift+左/右在图片预览打开时的横向滚动；Shift+上/下在图片预览时优先滚动预览区（与扩展后的 feature 行为一致）。  
- **对外 API**：无；`defineExpose` 不变。

## 7. 实施步骤

1. 实现 Shift 预览锁定：改 `handleMouseOver`，补边界用例（多选、挂起、`wasSuspended`）。  
2. 调整图片预览 DOM/CSS 与 `showImagePreview`/`handleImageLoad` 中的尺寸策略，完成矮图居中、窄图扩宽、溢出滚动。  
3. 扩展 `handleImagePreviewKeydown` 与全局 `text-preview-scroll-*`、新增横向热键绑定与 feature，消除重复触发。  
4. 拆分文字预览单行/多行样式与结构。  
5. `npm run build`；在 `npm run serve` 下按 `04-verify.md` 做手工场景验收（插件环境若需 uTools 能力再注明）。

## 8. 测试与验证方案

- **构建**：`npm run build` 必须通过。  
- **手工（主界面）**：  
  - 小图/窄图/长图各一类，Shift 长按打开预览，检查居中、扩宽、滚动条与 Shift+方向键。  
  - 长文本含换行与不含换行各一类，检查省略与滚动。  
  - Shift 按住预览时鼠标快速划过多行，预览与高亮条目不变；松开后鼠标移动恢复。  
  - 键盘上下键在 Shift 按住时是否仍能切换预览（应能）。  
- **回归**：悬浮预览（非 Shift）、列表上下键导航、搜索框聚焦、设置页热键不出现误触发。

## 9. 风险与回滚点

- **flex 居中 + 滚动** 组合易导致高图首屏偏移或滚动死区；需用真实大图、矮图对比验证，必要时回退到仅改 `align-items` 的最小方案并记录。  
- **热键重复消费**：Shift+方向键若被 registry 与弹层同时处理，可能出现双倍滚动；以「单一入口消费」为原则修复。  
- **窄图放大**：极端宽高比下高度可能超出视区，依赖现有纵向滚动，需在验收中确认。  
- 回滚：单文件 `ClipItemList.vue` + `hotkeyBindings.js` + `hotkeyLabels.js` 可独立 revert。

## 10. 待确认项

- 与 [`01-spec.md`](01-spec.md) §8 一致：**单行文字**判定是否采用「长文本且无换行」；**外部窗口**是否完全不在此迭代范围（默认是）。  
- `shift+ArrowLeft/Right` 在图片未打开时是否必须严格 `false`（不与 Tab 切换冲突）；若焦点在图片弹层，是否仍走全局 dispatch（依赖现有 `dispatch` 与 `eventToShortcutId` 行为，实现时以实测为准）。
