# 当前改动核心逻辑汇总

## 背景

本次改动围绕以下几类问题展开：

1. macOS 下快捷键显示与实际键位习惯不一致
2. macOS 下 `Option + 数字 / 字母` 无法稳定命中现有 `alt+...` 绑定
3. macOS 下 `Cmd + Option + F` 这类组合键在映射到 `ctrl` 绑定时仍可能因为修饰键顺序不一致而失配
4. 设置页“快捷键 / 功能配置”需要补齐说明、搜索交互与配置保存逻辑
5. 标签搜索弹窗的键盘事件需要阻断下沉到其他 layer
6. 开发环境中 `ResizeObserver` 噪声错误反复触发 runtime overlay

本文仅记录已经落地的核心逻辑，不把仍在调整中的纯样式细节视为最终结论。

---

## 1. macOS 快捷键展示层适配

### 1.1 Alt 在 macOS 下显示为 Option

- 文件：`src/global/shortcutKey.js`
- 新增：
  - `isMacPlatform()`
  - `formatShortcutDisplay(shortcutId)`
  - `formatShortcutTextForPlatform(text)`

核心逻辑：

- 保持内部绑定标识仍使用统一的 canonical shortcut id，例如 `alt+1`、`ctrl+alt+f`
- 在 UI 展示层判断当前平台
- 若为 macOS：
  - 快捷键显示中的 `alt` 展示为 `Option`
  - 功能说明文本中的 `Alt` 也展示为 `Option`

这样做的目的：

- 不改已有绑定表，不引入多套平台绑定
- 仅在展示层做平台语义转换，避免配置和分发逻辑分叉

### 1.2 快捷键树组件改为展示格式化后的键位

- 文件：`src/cpns/HotkeyTreeViewShortcut.vue`

核心逻辑：

- 原先直接展示 `shortcut.shortcutId`
- 现在改为通过 `formatShortcutDisplay()` 计算 `shortcutDisplay`
- 从而保证设置页快捷键树在 macOS 下显示 `Option`

### 1.3 快捷键功能说明文案接入平台格式化

- 文件：`src/global/hotkeyLabels.js`

核心逻辑：

- `getFeatureLabel(featureId)` 不再直接返回原始文案
- 改为统一经过 `formatShortcutTextForPlatform()`
- 例如：
  - `Alt+1 快速复制第 1 项`
  - 在 macOS 下显示为 `Option+1 快速复制第 1 项`

---

## 2. macOS 下 Option + 数字 / 字母命中 alt 绑定

### 2.1 问题根因

- 文件：`src/global/shortcutKey.js`

根因判断：

- 现有绑定表使用的是 `alt+1~9`
- 在 macOS 下按 `Option + 1~9` 或 `Option + 字母` 时，`KeyboardEvent.key` 可能不是原始键位，而是特殊字符，例如：
  - `Option+1 -> ¡`
  - `Option+2 -> ™`
- `Option+F` 这类组合也可能变成特殊符号或变音字符
- 原逻辑直接使用 `event.key` 参与归一化，导致事件被解析成 `alt+¡` 一类值
- 最终无法匹配 `hotkeyBindings.js` 中的 `alt+1~9` 或 `ctrl+alt+f`

### 2.2 修复方案

- 文件：`src/global/shortcutKey.js`
- 新增：
  - `CODE_ALIAS`

核心逻辑：

- 当满足以下条件时优先用物理键位 `event.code` 还原键位：
  - `e.altKey === true`
  - `e.code` 为 `Digit0 ~ Digit9` 或 `KeyA ~ KeyZ`
- 将这些场景强制归一化为物理键位对应的 canonical id：
  - `alt+0 ~ alt+9`
  - `alt+a ~ alt+z`

这样做的结果：

- macOS 下 `Option+1~9` 能与现有 `alt+1~9` 绑定重新对齐
- macOS 下 `Option+字母` 也能继续命中依赖 `alt` 的组合键
- 不需要额外复制一套 `meta/option` 专用绑定

---

## 3. macOS 下 Cmd + Option + F 最终失配根因

### 3.1 问题根因

- 文件：`src/global/hotkeyRegistry.js`

根因判断：

- 项目中已有 Mac 下 `meta -> ctrl` 的查找映射
- 但 `Cmd+Option+F` 在事件归一化后会先得到类似：
  - `alt+meta+f`
- 再做 `meta -> ctrl` 替换后，查找值会变成：
  - `alt+ctrl+f`
- 绑定表中的配置顺序是：
  - `ctrl+alt+f`
- 当前绑定查找是直接按字符串比较，修饰键顺序不一致就会失配

### 3.2 修复方案

- 文件：`src/global/hotkeyRegistry.js`

核心逻辑：

- `shortcutIdForLookup(shortcutId)` 在完成 `meta -> ctrl` 替换后
- 再次执行 `normalizeShortcutId(...)`
- 将修饰键重新规范到统一顺序

结果：

- `alt+meta+f`
- 替换后为 `alt+ctrl+f`
- 再标准化为 `ctrl+alt+f`
- 最终与绑定表成功对齐

---

## 4. 标签搜索快捷键说明补全

### 3.1 文案修正

- 文件：`src/global/hotkeyLabels.js`

改动前：

- `tag-search`: `打开标签搜索`

改动后：

- `tag-search`: `打开收藏标签搜索（跳转收藏子 tab）`

核心逻辑：

- 该功能实际不是通用全文搜索
- 而是打开标签搜索弹窗，用于跳转收藏子 tab
- 因此将文案调整为更接近真实行为的描述，避免设置页误导

---

## 5. 功能配置页的悬浮预览配置逻辑

### 4.1 新增配置入口与状态管理

- 文件：`src/views/Setting.vue`

新增状态：

- `hoverPreviewEnabled`
- `hoverPreviewDelay`

数据来源：

- `getHoverPreviewConfig(setting)`

核心逻辑：

- 从当前设置中读取 `userConfig.preview.hover`
- 将“是否启用”和“延时”拆成独立响应式状态
- 在设置页中单独展示与编辑

### 4.2 延时配置的规范化与校验

- 文件：`src/views/Setting.vue`
- 新增：
  - `normalizeHoverPreviewDelay(value)`
  - `ensureHoverPreviewDelay()`
  - `validateFeatureConfig()`

核心逻辑：

- 对延时输入统一做数值校验
- 非数字、负数时视为非法
- 保存前统一取整
- 当重新启用悬浮预览时，保证 delay 有合法值

### 4.3 保存与重置接入热更新链路

- 文件：`src/views/Setting.vue`

核心逻辑：

- `handleSaveBtnClick()` 中新增：
  - `validateFeatureConfig()`
  - `userConfig.preview.hover.enabled`
  - `userConfig.preview.hover.delay`
- 保存逻辑由直接写 `utools.dbStorage` 改为复用：
  - `saveSetting(payload)`

重置逻辑：

- `handleRestoreBtnClick()` 中改为：
  - `const restored = restoreSetting()`
  - `syncSetting(restored)`
  - 再同步 `hoverPreviewEnabled` / `hoverPreviewDelay`

这样做的目的：

- 保持功能配置与已有设置热更新链路一致
- 避免“写入成功但当前页面状态未同步”的问题

---

## 6. 设置页快捷键 / 功能 tab 的交互经验

### 6.1 说明信息尽量抽到 HelpHint，而不是占据正文

- 文件：`src/views/Setting.vue`
- 文件：`src/cpns/HelpHint.vue`

核心逻辑：

- 快捷键 tab、功能 tab 的“说明来源 / 展示规则 / 维护约定”等文字，改为收入口径统一的 `HelpHint`
- 标题区只保留：
  - 标题
  - `HelpHint`
  - 必要的统计信息

这样做的目的：

- 减少纵向空间消耗
- 让配置正文更聚焦于可操作内容
- 保持多个 tab 的说明风格一致

### 6.2 HelpHint 避免重复提示与难读排版

- 文件：`src/cpns/HelpHint.vue`

经验总结：

- 不要同时保留 `el-tooltip` 和按钮原生 `title`
- 否则 hover 时会出现两层重复提示

当前处理：

- 去掉按钮的 `title`
- tooltip 改为：
  - 限制最大宽度
  - 优先紧凑展示
  - 空间不够时允许自然换行

### 6.3 设置页搜索框不要边输边过滤，改为显式提交

- 文件：`src/views/Setting.vue`

核心逻辑：

- 将搜索状态拆成：
  - `shortcutQueryInput`：输入态
  - `shortcutQuery`：已执行搜索态
- `Enter` 时才把输入态同步到搜索态
- `clear` 时同步清空结果

这样做的目的：

- 减少树形列表频繁重算
- 让用户明确感知“搜索已执行”

### 6.4 Ctrl/Cmd + F 只在快捷键 tab 内聚焦搜索框

- 文件：`src/views/Setting.vue`

核心逻辑：

- 在设置页 `keydown` 监听中识别：
  - `Ctrl+F`
  - `Cmd+F`
- 仅当 `activeTab === 'shortcut'` 时生效
- 触发后直接聚焦 `shortcutSearchInputRef`

### 6.5 设置页输入框聚焦时，需要阻断主界面热键分发

- 文件：`src/global/hotkeyRegistry.js`
- 文件：`src/views/Setting.vue`

问题根因：

- 设置页中的输入框按键会在捕获阶段先经过全局热键分发
- 若不额外处理，`Enter`、`Ctrl+数字` 等可能继续落到主界面 layer
- 表现上会出现：
  - 输入框里按 Enter，却触发“选择粘贴”
  - 搜索框按快捷键，却命中主界面行为

修复方案：

- 设置页挂载时激活 `setting` layer
- 在 `hotkeyRegistry.dispatch(e)` 中新增：
  - 若当前层是 `setting`
  - 且 `event.target` 位于 `input / textarea / el-input / el-select / contenteditable`
  - 则直接返回，不继续分发给其他 layer

### 6.6 快捷键树默认折叠更适合设置页浏览

- 文件：`src/views/Setting.vue`

经验总结：

- “默认全部展开”更适合排查，不适合日常设置页浏览
- 设置页初始态改为默认折叠后，可读性更高，滚动负担更小

---

## 7. 标签搜索弹窗的键盘事件处理经验

### 7.1 当前层已消费的键，必须阻断下沉

- 文件：`src/cpns/TagSearchModal.vue`

问题现象：

- 标签搜索弹窗内按 `Enter`
- 当前层虽然已处理跳转 / 关闭逻辑
- 但事件仍可能继续下沉到下层主界面
- 导致触发底层的“复制 / 选择 / 粘贴”等行为

修复方案：

- 在 `handleKeydown(e)` 中为当前层消费的键统一走 `stopEvent()`：
  - `preventDefault()`
  - `stopPropagation()`
  - `stopImmediatePropagation()`

当前阻断的按键包括：

- `ArrowUp`
- `ArrowDown`
- `Enter`
- `Escape`
- `Ctrl/Cmd+Enter`

经验结论：

- 只靠 layer block feature 不一定足够
- 对于弹窗内部输入框，最稳妥的做法是“在目标层组件自己的 keydown 处理里直接强阻断”

### 7.2 弹窗提示区适合用紧凑胶囊布局

- 文件：`src/cpns/TagSearchModal.vue`

经验总结：

- 底部快捷键提示若直接横排文本，容易拥挤、换行难看
- 更适合改成：
  - 小胶囊
  - `kbd + 文本`
  - 支持自动换行

这样在桌面宽度下看起来接近单行，在窄宽度下也不会挤爆

---

## 8. 开发环境 ResizeObserver 噪声错误拦截

### 5.1 问题背景

- 文件：`src/global/initPlugin.js`
- 文件：`vue.config.js`

现象：

- 开发环境中会弹出 runtime overlay
- 报错内容为 `ResizeObserver loop limit exceeded`
- 这类错误通常属于布局观测噪声，不一定代表真实业务异常

### 5.2 现有逻辑的问题

- `initPlugin.js` 原来只精确匹配一个固定字符串
- 当浏览器或运行环境换成其它同类文案时，会穿透现有过滤逻辑

### 5.3 当前修复

- 文件：`src/global/initPlugin.js`

新增/调整：

- `RESIZE_OBSERVER_ERROR_PATTERNS`
- `getResizeObserverErrorMessage(event)`
- 放宽 `isResizeObserverError(event)` 的判定条件
- 新增 `window.onerror` 兜底
- `console.error` 拦截改为同时检查多个参数拼接后的消息

当前覆盖的文案包括：

- `ResizeObserver loop limit exceeded`
- `ResizeObserver loop completed with undelivered notifications`

### 5.4 devServer overlay 过滤

- 文件：`vue.config.js`

新增：

- `devServer.client.overlay.runtimeErrors`

核心逻辑：

- 对 `ResizeObserver loop limit exceeded` 做 dev overlay 层过滤
- 即使业务层已拦截，dev overlay 也额外做一次兜底

说明：

- 这一块的真实效果仍以本地刷新后的实际表现为准
- 由于当前环境缺少 `node/npm/pnpm`，本轮未完成运行验证

---

## 9. 当前可确认的结论

已落地并逻辑上成立的部分：

1. macOS 下快捷键展示已具备 `Alt -> Option` 的平台化转换能力
2. macOS 下 `Option + 数字 / 字母` 已能从事件解析层回落到 `alt+...` 绑定
3. macOS 下 `Cmd + Option + F` 这类组合键已通过“替换后再次标准化顺序”成功命中绑定
4. 标签搜索快捷键说明已改为贴合实际行为
5. 设置页已接入悬浮预览配置的读取、校验、保存、重置热更新链路
6. 设置页搜索框已改为显式提交，并能在输入控件聚焦时阻断主界面热键
7. 标签搜索弹窗内已消费的按键会在当前层强阻断，不再继续下沉
8. `ResizeObserver` 噪声错误拦截从单字符串匹配扩展为多入口、多文案兜底

仍需以页面实际效果继续确认的部分：

1. “预览配置”这一行的最终布局细节
2. dev runtime overlay 是否已在当前本地运行环境中完全消失

---

## 10. 涉及文件清单

- `src/global/shortcutKey.js`
- `src/global/hotkeyLabels.js`
- `src/cpns/HotkeyTreeViewShortcut.vue`
- `src/global/hotkeyRegistry.js`
- `src/cpns/TagSearchModal.vue`
- `src/cpns/HelpHint.vue`
- `src/views/Setting.vue`
- `src/global/initPlugin.js`
- `vue.config.js`
