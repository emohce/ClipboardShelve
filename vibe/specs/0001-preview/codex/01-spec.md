# Feature: 预览效果优化（图片 / 文字 / Shift 锁定）

## 1. 目标

- 优化插件内图片预览布局：保持现有预览层入口与占屏范围不大改的前提下，让矮图在可视区内上下居中，窄图优先按可用宽度放大展示，长图以宽度铺满为主并支持 `Shift + ↑/↓` 滚动查看。
- 优化 Shift 触发的文字预览：单行文本按约 90% 窗口宽度展示、上下居中、不自动换行，超出时以省略形式截断；多行文本支持 `Shift + ↑/↓` 滚动查看。
- 优化 Shift 预览期间的目标稳定性：当 Shift 长按预览已经打开时，仅鼠标移动不应切换当前预览对象；松开 Shift 后恢复现有鼠标联动。

## 2. 背景

- 原始需求见 [`docs/todo/260405-交互优化/预览效果优化/zt-Preview-原始需求.md`](../../../docs/todo/260405-%E4%BA%A4%E4%BA%92%E4%BC%98%E5%8C%96/%E9%A2%84%E8%A7%88%E6%95%88%E6%9E%9C%E4%BC%98%E5%8C%96/zt-Preview-%E5%8E%9F%E5%A7%8B%E9%9C%80%E6%B1%82.md)。
- 当前预览主逻辑集中在 [`src/cpns/ClipItemList.vue#L236`](../../../src/cpns/ClipItemList.vue#L236)、[`src/cpns/ClipItemList.vue#L667`](../../../src/cpns/ClipItemList.vue#L667)、[`src/cpns/ClipItemList.vue#L1214`](../../../src/cpns/ClipItemList.vue#L1214)。
- 图片预览当前整体容器虽然是遮罩居中，但内容区在 [`src/cpns/ClipItemList.vue#L2322`](../../../src/cpns/ClipItemList.vue#L2322) 采用 `align-items: flex-start`，导致矮图视觉上贴顶。
- 文字预览当前在 [`src/cpns/ClipItemList.vue#L738`](../../../src/cpns/ClipItemList.vue#L738) 使用 `pre-wrap` 与 `word-break: break-word`，会自动换行，不符合“单行铺满 + 省略”的目标。
- Shift 预览当前通过 [`src/cpns/ClipItemList.vue#L696`](../../../src/cpns/ClipItemList.vue#L696) 和 [`src/cpns/ClipItemList.vue#L1605`](../../../src/cpns/ClipItemList.vue#L1605) 绑定到 `activeIndex`，而鼠标移入行会在 [`src/cpns/ClipItemList.vue#L1214`](../../../src/cpns/ClipItemList.vue#L1214) 更新 `activeIndex`，因此预览中移动鼠标会刷新预览对象。

## 3. 用户场景 / 使用场景

- 场景 1：用户预览一张高度较小的图片，希望图片在遮罩内上下居中，而不是顶在上方空出大块下边距。
- 场景 2：用户预览一张宽度较小的图片，希望图片尽量放大到接近可用宽度，优先单屏阅读；如果内容仍溢出，再通过滚动查看，而不是保持很小尺寸。
- 场景 3：用户预览一张很高的长图，希望以宽度铺满为主，保持水平居中，通过 `Shift + ↑/↓` 纵向滚动浏览完整内容。
- 场景 4：用户预览单行长文本，希望文本在预览层内接近全宽展示、上下居中、不换行，超出部分以省略形式收尾。
- 场景 5：用户预览多行文本，希望保留整段内容并通过 `Shift + ↑/↓` 滚动阅读，而不是缩放文字或被鼠标移入其他行打断。
- 场景 6：用户按住 Shift 查看当前高亮项时，鼠标只是经过其他列表项，预览仍保持当前对象，直到松开 Shift。

## 4. 非目标

- 不重做预览架构，不新增预览类型，不新增依赖。
- 不调整预览触发方式，`Shift` 长按阈值和现有 hover preview 配置能力保持现状。
- 不修改 `public/plugin.json`、`public/preload.js`、`public/listener.js` 和 `src/global/` 的运行时契约；本次应尽量收敛在列表组件与相关样式。
- 不把鼠标滚轮、触控板手势、外部独立预览窗口行为统一纳入本次强制范围，除非实现时发现与插件内预览逻辑强耦合。

## 5. 验收标准

- 图片预览
  - 矮图在预览内容区内上下居中展示，不再默认贴顶。
  - 窄图在不破坏纵横比的前提下优先按可用宽度放大；能单屏看完时优先单屏展示。
  - 长图以宽度适配为主，水平居中；`Shift + ↑/↓` 只触发滚动，不触发缩放。
  - 过宽或过高图片允许出现滚动条，但预览层本身不应错位、溢出或失焦。
- 文字预览
  - 单行文本最大展示宽度约为窗口宽度的 90%，上下居中，禁止自动换行，超出部分显示省略效果。
  - 多行文本保留原文内容，`Shift + ↑/↓` 可以在文本容器内滚动。
- Shift 锁定
  - Shift 长按预览显示期间，仅鼠标移动不会改变当前预览对象。
  - 松开 Shift 后，当前已有的鼠标悬浮高亮、hover preview 挂起/恢复逻辑继续按原规则工作。

## 6. 边界与异常

- 空列表、空文本、非长文本、无效图片源时，不应强行打开预览；保持当前安全退出路径，参考 [`src/cpns/ClipItemList.vue#L668`](../../../src/cpns/ClipItemList.vue#L668)。
- 图片加载失败时，继续显示现有错误提示，不因布局调整丢失失败态，参考 [`src/cpns/ClipItemList.vue#L205`](../../../src/cpns/ClipItemList.vue#L205) 与 [`src/cpns/ClipItemList.vue#L2361`](../../../src/cpns/ClipItemList.vue#L2361)。
- 多选状态、搜索输入聚焦、键盘导航挂起 hover preview 的既有语义不能回归，尤其是 [`src/cpns/ClipItemList.vue#L1251`](../../../src/cpns/ClipItemList.vue#L1251) 和 [`src/cpns/ClipItemList.vue#L1397`](../../../src/cpns/ClipItemList.vue#L1397) 的挂起/恢复路径。
- `Shift + ↑/↓` 在预览打开时应优先服务预览滚动，不应误触发列表高亮移动；若图片预览与文字预览处理方式不同，需要在后续 `02-plan.md` 明确。
- 文件类型中内嵌图片目前也会复用图片预览入口，参考 [`src/cpns/ClipItemList.vue#L684`](../../../src/cpns/ClipItemList.vue#L684)；本次布局规则默认同样生效。

## 7. 影响范围

- 主要逻辑：[`src/cpns/ClipItemList.vue#L236`](../../../src/cpns/ClipItemList.vue#L236)
  - 图片预览样式计算、焦点、滚动、Shift 锁定、鼠标移入切换。
- 文本预览：[`src/cpns/ClipItemList.vue#L738`](../../../src/cpns/ClipItemList.vue#L738)
  - 单行 / 多行展示策略、滚动行为。
- 列表交互：[`src/cpns/ClipItemList.vue#L1214`](../../../src/cpns/ClipItemList.vue#L1214)、[`src/cpns/ClipItemList.vue#L1583`](../../../src/cpns/ClipItemList.vue#L1583)、[`src/cpns/ClipItemList.vue#L1695`](../../../src/cpns/ClipItemList.vue#L1695)
  - 鼠标移入、移出、方向键导航、Shift 长按预览与 activeIndex 联动。
- 样式：[`src/cpns/ClipItemList.vue#L2313`](../../../src/cpns/ClipItemList.vue#L2313)
  - `.text-preview-modal`、`.image-preview-modal` 的滚动、对齐、溢出表现。

## 8. 待确认项

1. “单行文字”是否仅指不含换行的长文本预览，还是包括当前未进入 `isLongText` 分支的短文本。
2. “自动扩放”对极小图片的上限是否允许超过当前 90% 可用宽度，还是以“尽量铺满但不超过容器”为硬约束。
3. 文字单行截断的视觉要求是否必须保留字面 ` ...`，还是接受常规 CSS ellipsis 效果。
