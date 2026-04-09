# UI Contract: Item Operation Hotkeys and Alias Save

**Feature**: [spec.md](../spec.md)  
**Scope**: 主界面单条目操作、抽屉序号执行、别名保存快捷键。

## C-001 — `F2` 别名新增/更新

- 当存在当前选中单条目时，`F2` **SHALL** 触发别名新增或更新入口。
- 当位于收藏页时，`F2` **SHALL** 保留原弹层链路，同时允许完成别名新增/更新。
- 无选中条目时，`F2` **SHALL NOT** 修改任何数据。

## C-002 — 抽屉序号映射一致性

- `c-right`（`ctrl+ArrowRight`）展开的操作列表序号与快捷执行序号 **SHALL** 一致。
- `ctrl+alt+num` **SHALL** 执行与当前列表同序号操作。
- 旧映射 `ctrl+shift+num` **SHALL NOT** 继续作为默认自动执行序号入口。

## C-003 — `shift+Enter` 别名保存触发

- 当条目满足“单文件且有别名”时，`shift+Enter` **SHALL** 触发重命名并粘贴流程。
- 当条目是组合粘贴或纯文本时，`shift+Enter` **SHALL** 保持原组合粘贴行为。
- 当条目不满足前置条件（无别名、无选中项）时，`shift+Enter` **SHALL NOT** 触发重命名。

## C-004 — 可见提示与迁移一致性

- 设置页快捷键列表中，抽屉序号执行展示 **SHALL** 更新为 `ctrl+alt+num`。
- 与条目操作相关的功能文案 **SHOULD** 保持与 feature 含义一致，避免“标签编辑”与“别名编辑”语义冲突。
