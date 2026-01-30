# 普通图片预览无效 — 核验说明

## Baseline
- Time: 2026-01-30
- Scope: 普通（剪贴板）图片预览流程与可能失效原因
- Status: 核验完成，已做最小修复

---

## 1. 原始实现摘要（基线）

### 1.1 普通图片数据来源
- 剪贴板变化时 `initPlugin.js` 的 `pbpaste()` 读取剪贴板：先判断文件、再文本、再图片。
- 图片分支：`clipboard.readImage()` → `image.toDataURL()` → 写入 `item = { type: 'image', data: 'data:image/png;base64,...' }`。
- 代码：`src/global/initPlugin.js` 约 596–614 行。

### 1.2 列表缩略图与预览入口
- 列表里 `item.type === 'image'` 时用 `getItemImageSrc(item)` 作为 `<img :src="...">`。
- `getItemImageSrc` → `resolvePreviewImageSrc(item.data)`；若 `isValidImageData(item.data)` 为真则直接返回 `item.data`（data URL）。
- 校验：`isValidImageData(data)` 要求 `data.startsWith('data:image/') && data.includes('base64,')`。
- 代码：`src/cpns/ClipItemList.vue` 约 32–44、216–255、252–255 行。

### 1.3 预览窗口流程
- 悬停/Shift 长按触发 `runPreviewForItem(item)`，图片时调用 `showImagePreview(null, item)`。
- `showImagePreview` 取 `src = getItemImageSrc(item)`，仅使用桌面预览：`desktopPreviewManager.createPreview(src, footerText, options)`。
- 若 `createPreview` 返回非 null，则只把 `imagePreview.value.show = false`，不再使用插件内弹层；若返回 null，仅打日志「桌面预览失败」，不展示插件内预览。
- 代码：`src/cpns/ClipItemList.vue` 约 257–290、611–617 行。
- 桌面预览：`src/global/desktopPreview.js` 的 `createDesktopPreviewWindow(src, ...)` 用模板字符串拼 HTML，其中 `<img src="${src}" ... />` 直接插值，然后 `document.write(html)`。

---

## 2. “普通图片预览无效”的可能原因（核验结论）

| 原因 | 说明 | 对应代码/行为 |
|------|------|----------------|
| **A. 弹窗被拦截** | uTools/环境限制导致 `window.open` 返回 null | `desktopPreview.js` 94–99 行；用户侧表现为「没有任何预览窗口」 |
| **B. img 的 src 未转义** | 若 `src` 中含 `"` 或 `&`，会截断或破坏 HTML 属性，新窗口里 `<img>` 加载失败，显示「图片加载失败」 | `desktopPreview.js` 212 行：`<img src="${src}" ...>` 未对 `src` 做 HTML 属性转义 |
| **C. data URL 过长** | 部分环境对 URL 长度有限制，超大图 base64 可能失败 | 仅大图可能触发，与「普通图片」关系较小 |
| **D. 列表显示「无效图片」** | 仅当 `getItemImageSrc(item)` 为空时出现（如 `item.data` 非字符串或不符合 data URL 格式） | `ClipItemList.vue` 40–44 行；正常剪贴板图片应为 data URL，一般不会触发 |

对「普通图片」而言，最值得先排除的是：**B（src 未转义）** 与 **A（弹窗未打开）**。

---

## 3. 调试日志（便于定位“还是不行”）

在以下位置增加了打印，便于在控制台区分是弹窗未开、写入失败还是预览窗内图片加载失败：

- **ClipItemList.vue `showImagePreview`**
  - 无 src 时：`[showImagePreview] 无有效 src，跳过预览` + item 信息
  - 有 src 时：`[showImagePreview] 触发预览` + `srcType`(data/file/other)、`srcLen`、触发方式(hover/keyboard)
  - 桌面预览创建成功：`[showImagePreview] 桌面预览窗口已创建...`
  - 创建失败：`[showImagePreview] 桌面预览失败，createPreview 返回 null...`

- **desktopPreview.js**
  - `createPreview`：`[DesktopPreview] createPreview 调用`（srcLen）；成功/失败各一条
  - `createDesktopPreviewWindow`：入参 `srcType`、`srcLen`；`window.open` 成功/失败；写入前 `写入预览页`（htmlLen、MB）；写入后 `预览页写入完成`
  - 预览窗口内脚本（需在**预览窗口**里打开开发者工具才能看到）：
    - 图片加载成功：`[DesktopPreview 预览窗] 图片加载成功`
    - 图片加载失败：`[DesktopPreview 预览窗] 图片加载失败` + src 前 80 字符

根据日志可判断：
- 只出现“触发预览”但没有“createPreview 调用”或“window.open 成功” → 调用链或 `window.open` 被拦截
- 有“window.open 成功”“写入预览页”但没有“预览页写入完成” → 写入/HTML 体积问题
- 有“写入完成”但预览窗里看到“图片加载失败” → 在预览窗口打开控制台看上述预览窗日志，确认是 src 问题还是跨域/安全策略

---

## 4. 已做的最小修复

- **修改文件**：`src/global/desktopPreview.js`
  - 在拼预览页 HTML 时，对写入 `<img src="...">` 的 `src` 做 HTML 属性转义，避免 data/file URL 中特殊字符截断属性导致预览失败。
- **修改文件**：`src/cpns/ClipItemList.vue`
  - **图片预览统一使用插件内弹层**：不再调用 `desktopPreviewManager.createPreview`（即不再使用 `window.open` 桌面预览）。所有图片预览（普通剪贴板图片 data URL、文件中的图片 file://）均通过 `imagePreview`（Teleport 到 body 的弹层）在插件窗口内居中显示，带 footer。`desktopPreview.js` 的 import 仍保留，仅用于组件卸载时 `closeAllPreviews()`（无窗口时无副作用）。
  - 为 `.image-preview-modal` 增加样式，保证插件内预览弹层内图片区域正确伸缩与 footer 显示。
- **行为**：所有图片预览均在插件内弹层完成，避免 `window.open` 被拦截或环境限制导致预览无效。

---

## 5. 测试要点

- 正常：复制一张普通 PNG/JPEG，悬停或 Shift 长按该条，应弹出桌面预览窗口且图片正常显示。
- 边界：桌面预览创建失败时，控制台应有「桌面预览失败」日志；列表缩略图仍由 `getItemImageSrc` 决定，data URL 正常则应显示缩略图。
- 回归：文件类型中的图片预览、长文本预览、Shift 预览入口不受影响。

---

## 6. 非本次范围

- 不改变 `window.open` 策略或 uTools 弹窗配置。
- 不增加插件内图片预览回退逻辑。
- 不修改剪贴板读取或数据库存储格式。
