# Plan: 预览效果优化（图片 / 文字 / Shift 锁定）

## 1. 变更目标
- 在不改预览入口和整体架构的前提下，修正插件内图片预览的对齐与缩放策略，使矮图居中、窄图尽量铺宽、长图按宽度适配后可滚动查看。
- 为 Shift 文字预览补充“单行 / 多行”两套展示模式，并统一 `Shift + ↑/↓` 在预览打开时的滚动行为。
- 在 Shift 长按预览期间锁定当前预览目标，避免鼠标移入其他行导致 `activeIndex` 变化后触发预览刷新。

## 2. 现状与根因
- 图片预览当前在 [`src/cpns/ClipItemList.vue#L236`](../../../src/cpns/ClipItemList.vue#L236) 直接按窗口尺寸写入 `imagePreview.style` 与 `imagePreview.imageStyle`，只做了“最大宽度限制 + 允许滚动”，没有区分矮图、窄图、长图三类布局。
- 图片内容区样式在 [`src/cpns/ClipItemList.vue#L2322`](../../../src/cpns/ClipItemList.vue#L2322) 固定为 `align-items: flex-start`，这是矮图贴顶的直接原因。
- 文字预览当前在 [`src/cpns/ClipItemList.vue#L738`](../../../src/cpns/ClipItemList.vue#L738) 一律使用 `pre-wrap` 与自动换行，没有单行模式，也没有为单行截断预留状态。
- `Shift + ↑/↓` 的主绑定目前只在 [`src/global/hotkeyBindings.js#L254`](../../../src/global/hotkeyBindings.js#L254) 指向 `text-preview-scroll-*`，图片预览则依赖图片弹层自身 `keydown` 监听 [`src/cpns/ClipItemList.vue#L352`](../../../src/cpns/ClipItemList.vue#L352)。两套入口割裂，文本与图片行为难以统一。
- `Shift` 长按预览期间，`keyboardTriggeredPreview` 为 true 时，`activeIndex` 的任何变化都会在 [`src/cpns/ClipItemList.vue#L1605`](../../../src/cpns/ClipItemList.vue#L1605) 触发 `triggerKeyboardPreview()`；而鼠标移入行会在 [`src/cpns/ClipItemList.vue#L1214`](../../../src/cpns/ClipItemList.vue#L1214) 更新 `activeIndex`，因此预览对象会被鼠标移动打断。

## 3. 设计方案
- 预览布局
  - 为图片预览增加基于图片天然尺寸与容器尺寸的布局判定，输出统一的“容器对齐方式 + 图片尺寸样式”。
  - 保留当前全屏遮罩和 footer 结构，只调整 `.image-preview-content` 与 `imagePreview.imageStyle` 的计算逻辑。
  - 判定原则采用最小改动：
    - 矮图：容器垂直居中，图片按现有比例展示。
    - 窄图：允许按可用宽度放大，优先单屏阅读；横向溢出时保留现有横向滚动。
    - 长图：按宽度适配，顶部或居中策略以“滚动查看完整内容”为优先，不再依赖图片保持原始高度。
- 文字预览
  - 在 `showTextPreview` 入口增加“是否单行文本”的派生状态，而不是改 `isLongText` 的触发条件。
  - 单行模式输出独立样式：90% 宽度、单行、省略、垂直居中。
  - 多行模式延续现有黑色弹层思路，但把滚动目标固定到正文容器，避免当前直接滚 `.text-preview-modal` 的不稳定行为。
- Shift 滚动统一
  - 保持 [`src/global/hotkeyBindings.js#L254`](../../../src/global/hotkeyBindings.js#L254) 的 `shift+ArrowUp/Down` 绑定不变，避免影响设置页和热键说明。
  - 将 `text-preview-scroll-*` 升级为统一的“预览滚动”特性：优先滚文字预览，其次滚图片预览；如果无预览打开则返回 false，让其它逻辑不受影响。
  - 图片弹层自身 `keydown` 逻辑可保留为兜底，但主流程应以 hotkeyRegistry 分发为准，减少焦点依赖。
- Shift 锁定
  - 在 `Shift` 预览激活期间增加一层“锁定预览目标”判断，阻止 `handleMouseOver` 仅因鼠标移入而改写 `activeIndex`。
  - 锁定只针对 `keyboardTriggeredPreview` 为 true 的窗口期；松开 Shift 后仍由 [`src/cpns/ClipItemList.vue#L1251`](../../../src/cpns/ClipItemList.vue#L1251) 的真实鼠标移动恢复 hover 语义。
  - 不改变键盘导航刷新预览的行为；上下键切换高亮时仍允许预览跟随当前高亮项更新。

## 4. 受影响文件
- [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue): 预览状态、图片/文字弹层样式计算、Shift 长按锁定、统一滚动特性注册与 DOM 引用。
- [`src/global/hotkeyBindings.js`](../../../src/global/hotkeyBindings.js): 保持现有快捷键不变，但需确认 `shift+ArrowUp/Down` 绑定说明仍适用于统一预览滚动实现；若需更名 feature id，在此处同步。
- [`specs/0001-preview/codex/03-tasks.md`](./03-tasks.md): 后续原子任务拆分。
- [`specs/0001-preview/codex/04-verify.md`](./04-verify.md): 后续实现完成后的验证记录。

## 5. 数据与状态变更
- 新增或细化的瞬时状态预计仍收敛在 [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue) 内，不引入持久化：
  - 图片预览布局模式或布局元数据，用于区分矮图 / 窄图 / 长图。
  - 文字预览展示模式，用于区分单行与多行。
  - Shift 预览锁定标记，表示当前是否禁止鼠标移入改写 `activeIndex`。
- 现有 `keyboardTriggeredPreview`、`hoverTriggeredPreview`、`hoverPreviewSuspendedByKeyboard` 语义保持不变，只在判断条件上增加锁定分支。

## 6. 接口与交互变更
- 用户可见交互
  - 图片预览的默认视觉位置与缩放策略会改变，但触发方式不变。
  - 单行文字预览从自动换行改为单行截断；多行文字保留滚动阅读。
  - Shift 预览显示期间，鼠标移动不再切换预览对象；键盘上下导航仍可切换。
- 内部接口
  - 不改 props / emits，不改外部组件调用方式。
  - 预览滚动入口会从“文本专用 feature”升级为“统一预览滚动 feature”，但仍挂在同一主层热键绑定上。

## 7. 实施步骤
1. 在 [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue) 梳理图片预览布局计算，拆出图片尺寸判定与样式生成，先修图片居中、铺宽与滚动逻辑。
2. 在同文件补充文字预览单行 / 多行模式与统一滚动容器，并让 `shift+ArrowUp/Down` 同时覆盖文字和图片预览。
3. 在同文件收敛 Shift 预览锁定逻辑，阻断鼠标移入刷新 `activeIndex`，并回归现有 hover preview 挂起/恢复链路。
4. 如统一滚动需要调整 feature 命名或绑定，再同步更新 [`src/global/hotkeyBindings.js`](../../../src/global/hotkeyBindings.js)。
5. 运行构建验证，并补充最小手工回归步骤到 `04-verify.md`。

## 8. 测试与验证方案
- 构建验证
  - `npm run build`
- 手工验证
  - 在 `npm run serve` 下验证图片预览：
    - 矮图是否上下居中。
    - 窄图是否明显放大且不失真。
    - 长图是否按宽度适配，`Shift + ↑/↓` 是否只滚动不缩放。
  - 验证文字预览：
    - 单行长文本是否单行展示、90% 宽度、超出省略。
    - 多行文本是否可通过 `Shift + ↑/↓` 滚动。
  - 验证 Shift 锁定：
    - Shift 长按预览显示后，鼠标经过其他行不切换预览。
    - 松开 Shift 后，鼠标再次移动可恢复高亮/悬浮预览联动。
  - 回归现有行为：
    - 非 Shift 的上下键导航仍正常。
    - hover preview 开关开启/关闭时原逻辑不回归。
    - 文件类型中首张图片预览仍可打开。
- 插件环境说明
  - 若仅执行 `npm run serve`，只能覆盖页面层交互；是否在 uTools 插件环境复核需在 `04-verify.md` 真实记录。

## 9. 风险与回滚点
- 风险
  - 图片天然尺寸获取若依赖 `img.onload` 时机，可能造成首次打开样式闪动或布局二次跳变。
  - 统一 `Shift + ↑/↓` 入口后，可能与列表导航、长按自动滚动或热键分发产生优先级冲突。
  - 锁定鼠标移入时如果判断过宽，可能误伤 hover preview 的恢复时机。
- 回滚点
  - 图片布局与文字模式可以只回退 `ClipItemList.vue` 中新增的派生状态和样式计算，不影响数据层。
  - 若统一滚动方案风险过高，可先保留现有 `hotkeyBindings`，仅在 `text-preview-scroll-*` 内扩展图片预览支持，避免动主层键位配置。

## 10. 待确认项
- 默认按 spec 执行，不额外新增确认项。
