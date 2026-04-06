# Error Memory Rules

## 目标
- 在实现前先检索仓库内已知错误经验，减少同类问题上的重复试错。
- 在失败后把高价值结论沉淀到仓库，而不是留在聊天记录里。
- 把“症状 -> 证伪路径 -> 已确认通路 -> 决策规则”结构化，供后续 AI 自动复用。

## 阅读顺序
1. 先读本文件。
2. 按“路径 / 模块 / 症状 / 关键 API / 运行环境”检索索引表。
3. 命中记录时，先读对应正文，再进入 `spec`、`plan` 或实现阶段。

## 错误类型
- `root-cause-misread`: 误判根因，把表象当根因。
- `framework-misuse`: 错用框架、库、组件或 API 能力。
- `runtime-path-mismatch`: 错认真实运行通路、真实滚动祖先、真实事件链、真实数据源。
- `invalid-verification`: 验证方式无效，导致结论失真。
- `repeated-trial`: 已证伪路径被重复尝试。
- `over-abstraction`: 过早抽象或过度重构，偏离最短可证实路径。
- `environment-assumption`: 对 `uTools`、浏览器、打包或插件运行环境假设错误。

## 检索触发规则
- 按路径或模块匹配，例如 `src/cpns/ClipItemList.vue`、`src/global/`、`public/preload.js`。
- 按症状匹配，例如“`active` 正常但自动滚动无效”“用户手动可用但程序调用无效”“只在插件环境异常”。
- 按关键 API 或关键逻辑匹配，例如 `scrollIntoView`、`scrollTop`、`scrollToIndex`、热键分发、窗口焦点。
- 按运行环境匹配，例如浏览器、`uTools` 插件、开发服务、构建产物。

## 强制行为
- 进入实现前，必须先按“路径 + 症状 + API + 环境”检索索引表。
- 命中记录时，必须先阅读正文，再决定方案。
- 若连续两次修复都未命中真实通路，禁止继续同方向微调，必须回到“确认真实运行通路”。
- 已证伪方案除非有新证据，否则禁止重复尝试。
- 发现新的失败模式时，必须补充或更新 `docs/ai-error-memory/` 的记录与索引。
- 如果本次任务命中了历史记录，`plan`、`verify`、最终说明都要写明“采用 / 规避了什么”。

## 处理优先级
1. 先确认是否已有同类记录。
2. 有记录时，优先采用“已确认通路”或“推荐优先策略”。
3. 无记录时，先验证真实运行通路，再做策略微调。
4. 如果验证路径本身可能失真，先修正验证路径，不继续实现。

## 记录索引
| id | type | symptoms | affected_paths | trigger_keywords | wrong_paths | confirmed_path | decision_rule | record_link |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EM-2026-04-06-scroll-path | `runtime-path-mismatch`, `framework-misuse`, `repeated-trial` | `active` 正常、鼠标滚轮正常、程序性自动滚动无效 | `src/cpns/ClipItemList.vue`, `src/hooks/useVirtualListScroll.js`, `src/style/cpns/clip-item-list.less` | `scroll`, `active`, `scrollTop`, `scrollToIndex`, `scrollIntoView`, `uTools` | 虚拟列表 `scrollToIndex(center)`、手动 `scrollTop`、阈值微调 | 普通列表 + 目标节点原生 `scrollIntoView()` | 若“用户手动滚动正常但程序滚动异常”，优先检查真实滚动祖先和原生 DOM 通路，不先调策略阈值 | [EM-2026-04-06-scroll-path](../docs/ai-error-memory/2026-04-06-scroll-path.md) |

## 记录模板
```md
# Error Memory: <id>

## 1. 背景与症状
## 2. 错误归类
## 3. 误判链路
## 4. 已证伪方案
## 5. 已确认通路
## 6. 适用触发条件
## 7. 禁止再试的做法
## 8. 推荐优先策略
## 9. 关联文件 / 模块
## 10. 后续观察点
```

## 维护规则
- 索引表只保留高信号摘要，完整复盘放到 `docs/ai-error-memory/`。
- 新记录必须同步更新索引，否则视为未沉淀。
- 旧记录失效时，要在索引和正文里明确标注替代方案。
- 没有形成可复用结论的临时试错，不写入索引。
