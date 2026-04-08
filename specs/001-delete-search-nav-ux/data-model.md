# Data Model: 001-delete-search-nav-ux

本特性不引入新持久化实体；以下为**用户可见状态与关系**，供实现与测试对齐命名。

## Clipboard item（剪贴板条目）

- **含义**: 列表中一行所代表的剪贴板历史或收藏项。  
- **关键属性（逻辑）**: 唯一 `id`、展示文本/缩略、是否锁定、是否收藏、与筛选/搜索的匹配关系。  
- **与本特性关系**: 删除后须从当前 `showList` 消失且持久层一致；`preferItemId` 用于删除后高亮恢复。

## List view state（列表视图状态）

- **showList**: 当前 Tab + 搜索 + 锁筛选下的可见条目有序列表。  
- **activeIndex**: 键盘高亮下标。  
- **deleteAnchor**: 删除后一次性导航锚点（`anchorIndex`、`preferItemId` 等），消费后清空。  
- **约束（来自规格）**: `showList` 变化时，删除恢复导航不得误判为“条目复活”；`activeIndex` 须始终可映射到可视区域内的 DOM 行（在数据存在时）。

## Search session（搜索会话）

- **filterText**: 搜索框查询字符串；与父组件 `modelValue` 同步。  
- **lockFilter**: `all` | `locked` 等锁定筛选。  
- **isSearchPanelExpand / mainState**: 主窗热键层 `search` 与 `normal` 等（见 `Main.vue` `setMainState`）。  
- **约束**: 查询被清空时的“退出搜索”行为须可区分 **用户意图清空** 与 **缺陷路径清空**；IME 组字期间 Enter 不改变 `activeIndex` 对应条目的“主确认”语义。

## Hotkey dispatch（热键分发）

- **layer**: 如 `main`、`clip-drawer`、清空对话框层等。  
- **feature**: 如 `list-enter`、`list-delete`；处理函数可读取 `KeyboardEvent`（`isComposing` 等）。  
- **约束**: 搜索框聚焦时，特性行为须与“文本输入优先”一致。

## Validation rules（与规格对齐）

| 规则 ID | 描述 |
|---------|------|
| V-001 | 删除提交成功后，当前会话 `showList` 不含被删 `id`。 |
| V-002 | 无撤销前提下，持久化后再进入插件，被删 `id` 不应再现（除非产品定义“回收站”类机制——当前规格外）。 |
| V-003 | `filterText` 非空或用户未明确退出时，`mainState` 不应无声切回非搜索且无说明。 |
| V-004 | `e.isComposing` 为真且焦点在搜索框时，`list-enter` 不得触发复制并退出。 |
| V-005 | 每次方向键改变 `activeIndex` 后，对应 `.clip-item[data-index]` 在滚动容器内完整可见（规格定义的可见度）。 |
