# UI Contract: Keyboard, Search, and List Selection

**Feature**: [spec.md](../spec.md)  
**Scope**: 主界面剪贴板列表 + 搜索框 + `main` 热键层。

## C-001 — 搜索框文本输入优先

当 **`document.activeElement` 为 `.clip-search-input`**（或位于 `.clip-search` 内可编辑控件）时：

- ** SHALL NOT** 将 **用于确认 IME 组字** 的 **Enter** 解释为 **`list-enter`**（复制并退出主流程）。  
- ** MAY** 在组字结束后继续使用产品既有 Enter 语义（需与单测/手工表一致）。

## C-002 — 搜索会话结束条件

以下情形 **允许** 结束搜索会话（折叠面板或 `mainState` 离开 `search`）：

- 用户清空查询且 **`lockFilter` 为 `all`** 等业务定义的“空则退出”条件达成；或  
- 用户执行明确的 UI 操作（如 ESC、点按关闭，以产品定义为准）。

以下情形 ** SHALL NOT** 单独导致退出：

- 输入规格允许的单字符检索内容本身（无配合“清空模型”的缺陷路径）。  

## C-003 — 删除结果

在用户完成删除流程后：

- 被删条目 ** SHALL** 从当前 `showList` 移除；  
- ** SHALL NOT** 在无撤销前提下重新插入当前会话列表。

## C-004 — 键盘导航可见性

每次 **`activeIndex`** 因方向键或分页键变更并最终稳定后：

- 对应列表项 ** SHALL** 在列表滚动容器视区内 **完整可见**（见规格对“完整可见”的定义）；  
- 在非首尾受限区域 ** SHOULD** 接近垂直居中。

## C-005 — 与热键注册的一致性

新增或修改 feature 时，若同类操作已存在 **“搜索框焦点短路”** 模式（例如 `isFocusInSearch`），** SHALL** 在相同风险的路径上保持一致，避免遗漏 Enter、方向键、Delete 等。
