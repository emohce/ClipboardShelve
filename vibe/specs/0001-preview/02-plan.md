# Plan: 剪贴板预览效果优化（图片 / 文字 / Shift 锁定）

## 1. 变更目标
- 在不改预览入口和整体架构的前提下，修正插件内图片预览的对齐、放大与滚动策略，使矮图居中、窄图优先铺宽、长图按宽度适配后可滚动查看。
- 为 Shift 文字预览补充“单行 / 多行”两套展示模式，并统一 `Shift + 方向键` 在预览打开时的滚动行为。
- 在 Shift 长按预览期间锁定当前预览目标，避免鼠标移入其他行导致 `activeIndex` 变化后触发预览刷新。

## 2. 现状与根因
- [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue) 中 `.image-preview-content` 当前为顶部对齐，直接导致矮图视觉贴顶。
- `showImagePreview` 当前只做 `maxWidth` 限制，没有“窄图按可用宽度放大”的策略。
- `handleImagePreviewKeydown` 目前只支持 `Shift + ↑/↓`，缺少图片横向溢出的 `Shift + ←/→` 处理。
- [`src/global/hotkeyBindings.js`](../../src/global/hotkeyBindings.js) 当前仅将 `shift+ArrowUp/Down` 绑定给 `text-preview-scroll-*`，图片与文字预览滚动入口割裂。
- `handleMouseOver` 会在鼠标移入时改写 `activeIndex`，而 `watch(activeIndex)` 在 `keyboardTriggeredPreview` 为真时会刷新预览，导致 Shift 预览期间鼠标划过列表会切换预览对象。

## 3. 设计方案
- 图片预览布局
  - 在现有图片预览入口内补充图片布局判定，区分矮图、窄图、长图，统一输出容器对齐方式与图片尺寸样式。
  - 必要时通过内容包裹层解决“矮图居中 + 长图可滚动”的冲突，避免仅靠单一 flex 对齐造成滚动死区。
  - 保留当前全屏遮罩和 footer 结构，不改外部窗口预览路径。
- 文字预览模式
  - 在现有文字预览入口内派生单行 / 多行展示模式，不改变 `LONG_TEXT_THRESHOLD` 与现有触发语义。
  - 单行模式使用约 90% 窗口宽度、垂直居中、单行省略；多行模式保留滚动容器与完整文本内容。
- 统一 Shift 滚动
  - 保留 `shift+ArrowUp/Down` 现有主层快捷键，扩展为“优先滚动当前打开的预览容器”。
  - 新增 `shift+ArrowLeft/Right`，仅在图片预览打开且存在横向溢出时生效。
  - 统一全局热键分发与弹层内监听的优先级，保证单次按键只消费一次，不出现双倍滚动。
- Shift 锁定
  - 仅阻断鼠标移入导致的 `activeIndex` 变更，不阻断 Shift 预览期间通过键盘上下键切换条目时的预览刷新。
  - 继续沿用现有 `keyboardTriggeredPreview`、hover preview 挂起/恢复链路，不引入新的全局状态机。

## 4. 受影响文件
- [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue): 预览状态、图片/文字弹层样式计算、Shift 锁定、统一滚动逻辑与必要的模板包裹层调整。
- [`src/global/hotkeyBindings.js`](../../src/global/hotkeyBindings.js): 预览滚动快捷键绑定扩展，包括 `shift+ArrowLeft/Right`。
- [`src/global/hotkeyLabels.js`](../../src/global/hotkeyLabels.js): 预览滚动相关 feature 文案说明。

## 5. 数据与状态变更
- 仅新增组件内瞬时状态或派生状态，不引入持久化变更。
- 允许新增：
  - 图片预览布局派生信息，用于区分矮图 / 窄图 / 长图。
  - 文字单行 / 多行展示派生标志。
  - Shift 预览锁定判定。
- 现有 `keyboardTriggeredPreview`、`hoverTriggeredPreview`、`hoverPreviewSuspendedByKeyboard` 等状态语义保持不变。

## 6. 接口与交互变更
- 用户可见交互
  - 图片预览的默认视觉位置与尺寸策略会改变，但触发方式不变。
  - 单行文字预览从自动换行改为单行截断；多行文字保留滚动阅读。
  - Shift 预览显示期间，鼠标移动不再切换预览对象；键盘上下导航仍可切换。
  - 图片横向溢出时，`Shift + ←/→` 可在预览区内横向滚动。
- 内部接口
  - 不改组件 props / emits，不改外部调用方式。
  - 预览滚动 feature 从文本专用扩展为统一预览滚动入口。

## 7. 实施步骤
1. 先修改鼠标移入锁定逻辑，确保 Shift 预览期间目标稳定，同时不影响键盘切换刷新预览。
2. 再调整图片预览容器布局与尺寸计算，完成矮图居中、窄图放大、长图滚动的基础能力。
3. 再统一 `Shift + ↑/↓` 滚动入口，并新增 `Shift + ←/→` 图片横向滚动能力，理顺全局热键与弹层监听的消费顺序。
4. 最后补充文字预览单行 / 多行展示模式与滚动容器行为。

## 8. 测试与验证方案
- 构建验证
  - `npm run build`
- 手工验证
  - `npm run serve` 下验证小图、窄图、长图的居中、铺宽、纵向滚动与横向滚动行为。
  - 验证单行长文本的 90% 宽度、单行省略与上下居中效果。
  - 验证多行文本通过 `Shift + ↑/↓` 滚动阅读。
  - 验证 Shift 长按预览时鼠标划过其他条目不切换预览，松开后恢复原有联动。
  - 回归非 Shift 的列表导航、hover preview、搜索聚焦等既有行为。
- 未覆盖项
  - 未在 uTools 真插件环境执行时，只能说明页面层行为已验证，不能写成插件运行时已通过。
  - 外部独立预览窗口不在本次验证范围。

## 9. 风险与回滚点
- flex 居中与滚动并存可能造成长图首屏偏移或滚动死区，需要通过真实大图验证。
- 热键可能被全局注册和弹层监听重复消费，需保证单次响应。
- 小图放大后高度可能超出视区，依赖滚动容器兜底。
- 回滚集中在 [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue)、[`src/global/hotkeyBindings.js`](../../src/global/hotkeyBindings.js)、[`src/global/hotkeyLabels.js`](../../src/global/hotkeyLabels.js) 三处后续实现改动。

## 10. 待确认项
- 无
