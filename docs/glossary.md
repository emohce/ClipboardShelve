# Glossary

## 目标
- 统一仓库内高频术语，减少用户、AI 和代码实现之间的语义漂移。

## 术语
- `active` / `activeIndex`
  当前由键盘或程序逻辑选中的列表项索引，不等同于鼠标 hover 态。

- `hover`
  鼠标悬浮态。默认优先级低于键盘导航和恢复动作。

- `real runtime path`
  真正会生效的运行通路，例如真实滚动祖先、真实事件链、真实数据源，不是推测出来的逻辑路径。

- `error memory`
  结构化错误复盘记录，描述某类问题的症状、误判链路、已证伪方案、已确认通路和决策规则。

- `ADR`
  Architecture Decision Record，记录长期有效的技术决策与取舍，不记录一次性聊天结论。

- `knowledge capture`
  任务完成前把新错误模式、长期决策、术语变化写回仓库文档的动作。

- `high-risk area`
  修改后可能影响插件运行时、窗口行为、热键链、持久化或核心交互的目录，例如 `public/` 和 `src/global/`。

- `uTools default window`
  用户未主动调整尺寸时，插件默认打开的窗口大小。涉及滚动、布局、可见区域时优先按这个环境考虑。
