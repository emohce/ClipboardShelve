# Tasks

- [x] T1 实现 Shift 预览锁定，阻断鼠标移入改写 `activeIndex`
  - 只在 `keyboardTriggeredPreview` 激活期间拦截鼠标驱动的预览切换，保留键盘上下键切换条目时的预览刷新能力。

- [x] T2 重构图片预览布局判定，支持矮图居中、窄图铺宽、长图滚动
  - 在 [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue) 内补充图片尺寸与容器布局派生逻辑，必要时增加内容包裹层，避免出现长图滚动死区。

- [x] T3 统一预览滚动热键，补齐图片 `Shift + ↑/↓/←/→` 行为
  - 扩展 [`src/global/hotkeyBindings.js`](../../src/global/hotkeyBindings.js) 与 [`src/global/hotkeyLabels.js`](../../src/global/hotkeyLabels.js)，让主层热键优先滚动当前打开的预览容器，并保证按键只消费一次。

- [x] T4 拆分文字预览单行 / 多行展示模式
  - 单行文本使用约 90% 宽度、垂直居中、单行省略；多行文本保留完整内容与纵向滚动能力，不改变现有触发阈值与入口语义。

- [x] T5 完成构建验证、手工回归与 `04-verify.md` 记录
  - 运行 `npm run build`，在 `npm run serve` 下覆盖图片、文字、Shift 锁定与非 Shift 回归场景，并将已验证/未验证项如实写入 [`specs/0001-preview/04-verify.md`](../../specs/0001-preview/04-verify.md)。
