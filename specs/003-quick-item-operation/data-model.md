# Data Model: 003-quick-item-operation

## Entity: Item（单条目）

- **字段（业务层）**
  - `id`: 唯一标识
  - `type`: 条目类型（`file` / `text` / 其他）
  - `data`: 条目原始内容（文件列表、文本等）
  - `tag` / alias 字段：用于显示与重命名引用的别名数据（具体字段名在实现阶段对齐现有结构）
  - `locked`: 是否锁定（与本特性无直接修改，但影响可操作性）

- **约束**
  - `F2` 仅在存在当前选中单条目时可触发别名新增/更新。
  - 收藏页保持既有弹层触发前提不变。

## Entity: OperationMenuEntry（操作菜单项）

- **字段（运行态）**
  - `id`: 操作唯一标识
  - `label`: 菜单展示文案
  - `available`: 当前条目是否可执行
  - `index`: 抽屉中显示序号（1..n）

- **约束**
  - `c-right` 展示顺序与 `ctrl+alt+num` 执行映射必须来自同一菜单数组。
  - 序号超出可执行菜单范围时不执行并给出反馈。

## Entity: HotkeyBinding（热键绑定）

- **字段（配置层）**
  - `layer`: 作用层（本需求主要为 `main`）
  - `shortcutId`: 快捷键 ID（如 `ctrl+alt+1`）
  - `features`: 触发的 feature id 列表
  - `state`: 可选状态（本需求默认无额外 state）

- **状态迁移**
  - `ctrl+shift+num`（旧） -> `ctrl+alt+num`（新）
  - 新增 `shift+Enter` -> `list-save-by-alias`（拟定 id）

## Entity: AliasSaveContext（别名保存上下文）

- **字段（执行瞬时）**
  - `hasAlias`: 当前条目是否已有别名
  - `isSingleFile`: 是否“单文件”条目
  - `targetPath`: 粘贴目标位置
  - `fallbackMode`: 非单文件时回退的组合粘贴模式

- **状态转移**
  - `hasAlias && isSingleFile` -> `rename_and_paste`
  - `!hasAlias || !isSingleFile` -> `composite_paste`
