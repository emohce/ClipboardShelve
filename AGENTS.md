# EzClipboard Agent Guide

## 1. Read First
- `ai-rules/00-writing-style.md`
- `ai-rules/01-spec-extraction.md`
- `ai-rules/02-architecture-planning.md`
- `ai-rules/03-task-decomposition.md`
- `ai-rules/04-implementation-constraints.md`
- `ai-rules/05-verification-checklist.md`
- `ai-rules/06-change-log-format.md`

## 2. Workflow
- 复杂任务必须遵循 `spec -> plan -> tasks -> implement -> verify`。
- 没有 `01-spec.md` 和 `02-plan.md` 时，不直接进入实现。
- 实现阶段一次只处理一个任务，完成后更新 `04-verify.md`。
- 所有规则优先落盘到仓库，不依赖聊天记录维持上下文。

## 3. Specs Layout
```text
specs/
  <feature-id>/
    01-spec.md
    02-plan.md
    03-tasks.md
    04-verify.md
```

## 4. Repository Context
- `src/views/`：页面入口
- `src/cpns/`：页面组件
- `src/global/`：插件运行期、快捷键、窗口、数据能力
- `src/hooks/`、`src/utils/`：复用逻辑
- `src/style/`：Less 样式
- `public/`：uTools 插件静态资源与入口脚本
- `dist/`：构建产物，不手改

## 5. Commands
- install: `npm install`
- dev: `npm run serve`
- build: `npm run build`

## 6. Implementation Rules
- 保持 Vue 3 + JavaScript 现有风格，不引入 TypeScript。
- 保持 2 空格缩进，不做无必要重构、重命名、目录迁移。
- 优先修根因，避免表面绕过。
- 不擅自修改无关文件，不回退用户已有改动。
- 涉及 `public/plugin.json`、`public/preload.js`、`public/listener.js`、`src/global/` 时必须明确说明影响。

## 7. Verification Rules
- 当前仓库默认验证命令为 `npm run build`。
- 如涉及页面行为，补充 `npm run serve` 下的最小手工验证步骤。
- 如涉及 uTools 运行时能力，明确说明是否已在插件环境验证。
- 未执行的验证项必须直说，不得写成已通过。

## 8. Final Response
- 必须包含：变更摘要、关键文件、风险/兼容性影响、验证结果、后续可选优化。
- 默认中文回答；代码、命令、提交信息保持原语言语境。
