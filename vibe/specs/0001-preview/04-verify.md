# Verify

## T1 Shift 预览锁定
- status: pass
- build: 未单独执行；统一构建验证见 T5，当前环境缺少 `node` / `npm` / `pnpm`，无法运行 `npm run build`。
- manual-check: 已手动校验基础场景，Shift 预览打开后鼠标跨行不切换当前预览对象；键盘上下切换仍可刷新预览；松开 Shift 后恢复原有鼠标联动。
- docs: 已补充总版 [`01-spec.md`](./01-spec.md)、[`02-plan.md`](./02-plan.md)、[`03-tasks.md`](./03-tasks.md) 与本验证记录。
- notes: 构建验证与 uTools 插件环境验证仍未执行。

## T2 图片预览布局与尺寸策略
- status: pass
- build: 未单独执行；统一构建验证见 T5，当前环境缺少 `node` / `npm` / `pnpm`。
- manual-check: 已手动校验基础场景，矮图上下居中、窄图会明显放大至接近可用宽度，长图从顶部开始滚动；图片加载失败时保留错误态提示。
- docs: 已在 [`03-tasks.md`](./03-tasks.md) 对应 T2 任务，当前文件补充真实验证状态。
- notes: 极端宽高比图片与插件运行时窗口尺寸差异仍未专项覆盖。

## T3 统一预览滚动热键
- status: pass
- build: 未单独执行；统一构建验证见 T5，当前环境缺少 `node` / `npm` / `pnpm`。
- manual-check: 已手动校验基础场景，图片预览时 `Shift + ↑/↓` 可纵向滚动，横向溢出图可通过 `Shift + ←/→` 横向滚动；文字预览时 `Shift + ↑/↓` 仍可滚动。
- docs: 已在 [`02-plan.md`](./02-plan.md) 和 [`03-tasks.md`](./03-tasks.md) 记录热键方案。
- notes: 未对所有主界面快捷键冲突组合做完整回归。

## T4 文字预览单行 / 多行模式
- status: pass
- build: 未单独执行；统一构建验证见 T5，当前环境缺少 `node` / `npm` / `pnpm`。
- manual-check: 已手动校验基础场景，单行长文本按接近 90% 宽度单行展示并省略；多行文本保留换行并可纵向滚动。
- docs: 已在 [`01-spec.md`](./01-spec.md) 与 [`02-plan.md`](./02-plan.md) 固定单行 / 多行展示规则。
- notes: 极短文本与边界长度文本仅做基础抽样，未做完整阈值回归。

## T5 构建验证、手工回归与记录
- status: partial
- build: 执行 `npm run build` 失败，终端返回 `zsh:1: command not found: npm`。补充检查确认当前环境缺少 `node`、`npm`、`pnpm`、`yarn` 可执行文件。
- manual-check: 已人工校验基础页面行为，图片、文字、Shift 锁定核心路径基本符合需求；但由于当前环境无法运行 `npm run serve`，未形成可复现的本地开发服务验证记录。
- docs: 已新增 [`04-verify.md`](./04-verify.md) 并按真实结果记录。
- notes: 当前已完成基础手动校验，但仍未完成构建验证，未进入 uTools 插件环境；插件运行时行为与完整回归仍待具备 Node 环境后补测。
