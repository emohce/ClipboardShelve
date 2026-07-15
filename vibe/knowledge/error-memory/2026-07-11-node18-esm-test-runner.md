---
id: EM-2026-07-11-node18-esm-test-runner
status: verified
scope: EzClipboard local test toolchain
fingerprint: node18-dynamic-import-js-esm-without-package-type-unexpected-token-export
first_seen: 2026-07-11
last_verified: 2026-07-11
review_after: 2026-10-11
evidence:
  - test
  - code
tags:
  - node
  - esm
  - commonjs
  - test-toolchain
  - windows-compatibility
---

# Node 18 下核心测试无法加载 `.js` ESM 源码

Tool: codex

## 症状

Node 18.20.8 运行图片路径或快捷键核心测试时，在动态导入项目 `.js` ESM 源码处报 `SyntaxError: Unexpected token 'export'`；同一测试在项目脚本指定的 Node 24 下通过。

## 错误思路

- 看到 Vite 构建可运行，就推断所有项目测试也支持 Vite 声明的 Node 版本范围。
- 直接给 [`package.json`](../../../package.json#L1-L30) 增加 `"type": "module"`；现有测试文件使用 CommonJS `require`，未经整体迁移会引入反向破坏。

## 已验证根因

项目包未声明模块类型或 Node 下限，而测试通过动态 `import()` 加载含 ESM 导出的 `.js` 源码（[图片路径测试](../../../test-image-payload-path.js#L4-L8)、[快捷键测试](../../../test-shortcut-command-system.js#L3-L12)）。Node 18 不会按当前高版本 Node 的方式自动重解析这类文件，因此测试加载阶段失败。POSIX 辅助脚本已明确切换 Node 24（[构建脚本](../../../build.sh#L41-L46)、[开发脚本](../../../scripts/dev-serve.sh#L41-L46)），但直接执行 `pnpm` 或 Windows 环境没有等价版本门禁。

## 正确检测顺序

1. 先确认实际 Node 版本，再区分“Vite 构建兼容”与“仓库测试运行器兼容”。
2. 检查 `package.json` 模块类型、测试文件扩展名以及动态导入目标。
3. 在项目当前基线 Node 24 下重跑受影响测试；通过后才把失败归类为 Node 18 测试加载兼容，而不是业务回归。

## 禁止再试

- 不要用一次成功构建替代快捷键、路径等聚焦测试。
- 不要只为消除该错误直接切换整个包的模块类型；必须先评估所有 CommonJS 测试和脚本。

## Alternative Route

- status: verified
- preconditions: 使用当前仓库脚本和现有依赖验证本地代码。
- steps: 使用 Node 24 与仓库声明的 pnpm 10.32.0，再运行受影响的聚焦测试和生产构建。
- verification: 2026-07-11，Node 24.14.0 下图片路径测试、快捷键测试和 `pnpm run build` 均通过。
- applicability boundary: 仅证明当前本地测试/构建基线；不替代 Windows uTools 实机验证。
- fallback: 若必须支持 Node 18，先单独设计并验证测试模块边界，再修改 `engines`、扩展名或模块类型。
