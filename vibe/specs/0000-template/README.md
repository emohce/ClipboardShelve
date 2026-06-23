# Specs Template

Tool: codex

## 用途
- 作为新需求目录的起始模板。
- 复制模板到当前任务目录使用；目录规则见 [CodeNote process rules](../../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/process/rules.md#3-project-location)。
- 中大型任务必须补齐知识上下文、范围边界、进度状态和记忆路由，防止实现跑偏。

## 包含文件
- `01-spec.md`：定义需求、边界、验收标准
- `02-plan.md`：定义技术方案、影响文件、验证方式
- `03-tasks.md`：拆分原子任务
- `04-verify.md`：记录实现后的验证结果

## 使用建议
1. 先阅读 [../PROJECT_STATUS.md](../PROJECT_STATUS.md) 和 [../../knowledge/MEMORY_INDEX.md](../../knowledge/MEMORY_INDEX.md)
2. 先补全 `01-spec.md`
3. 再写 `02-plan.md`
4. 再拆 `03-tasks.md`
5. 实现时逐项更新 `03-tasks.md` 和 `04-verify.md`
6. 关闭任务前同步 [../PROJECT_STATUS.md](../PROJECT_STATUS.md) 和必要的记忆索引
