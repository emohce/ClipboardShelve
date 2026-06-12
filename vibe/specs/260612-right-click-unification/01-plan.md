# 右键统一优化计划

Tool: codex

## 结论

右键统一当前不应先做视觉重排，而应先统一“右键入口、菜单数据源、命令执行、设置页配置、验收证据”五件事。现有代码已经有可复用基础：列表行右键入口在 [src/cpns/ClipItemRow.vue](../../../src/cpns/ClipItemRow.vue:15)，抽屉菜单数据源在 [src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:1264)，右键打开抽屉在 [src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:1275)，抽屉自身已有命令层和数字选择在 [src/cpns/ClipDrawerMenu.vue](../../../src/cpns/ClipDrawerMenu.vue:111)。本轮已完成第一阶段，审计状态同步到 [vibe/specs/260610-shortcuts-redesign/10YG2-zz-audit-快捷键命令系统一致性清单.ad](../260610-shortcuts-redesign/10YG2-zz-audit-快捷键命令系统一致性清单.ad:27)。

## 目标

- 统一主列表右键、键盘打开抽屉、数字执行、设置页展示所依赖的菜单模型。
- 保留现有用户行为：右键打开右侧抽屉、可拖拽排序、抽屉数字快捷选择、别名编辑固定靠前。
- 降低漂移风险：渲染菜单、快捷键序号执行、设置页说明必须来自同一 action 描述。
- 不触碰存储迁移、SQLite schema、主列表滚动结构、搜索 IME guard。

## 当前评估

| 项 | 状态 | 证据 | 判断 |
|---|---|---|---|
| 右键入口 | 已有 | [src/cpns/ClipItemRow.vue](../../../src/cpns/ClipItemRow.vue:15) 对左右键分发，父组件在 [src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:1614) 打开抽屉 | 可保留 |
| 菜单数据源 | 已完成第一阶段 | [src/global/contextMenuActions.js](../../../src/global/contextMenuActions.js:76) 生成抽屉菜单；[src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:1264) 改为消费统一模型 | 已有纯函数测试 |
| 命令执行 | 已完成第一阶段 | 抽屉层命令注册在 [src/cpns/ClipDrawerMenu.vue](../../../src/cpns/ClipDrawerMenu.vue:111)，列表层数字子动作通过 [src/global/contextMenuActions.js](../../../src/global/contextMenuActions.js:103) 统一解析序号，并在 [src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:2590) 执行同一 action | 序号选择模型已收口 |
| 用户排序 | 已有 | [src/cpns/ClipDrawerMenu.vue](../../../src/cpns/ClipDrawerMenu.vue:101) 发出 reorder，父组件保存 `drawer.order` | 保留，暂不迁移 SQLite |
| 设置页统一管理 | 已完成第一阶段 | [src/views/Setting.vue](../../../src/views/Setting.vue:675) 展示右键菜单摘要；[src/views/Setting.vue](../../../src/views/Setting.vue:776) 提供右键菜单弹窗；[src/views/Setting.vue](../../../src/views/Setting.vue:1836) 拖拽后写回 `drawer.order` | 已支持查看、拖拽排序和恢复默认顺序 |

## 实施计划

### P1 菜单模型统一

修改文件：

- `src/global/` 新增或复用一个纯 action adapter，例如 `contextMenuActions.js`。
- [src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:1276) 改为消费 adapter。

预期改动：

- 把 `operation -> drawer action` 的 id、title、icon、risk、source、orderable、commandId 显式化。
- `aliasDrawerOperation` 插入规则保留为“第 2 位或末尾前置”，但写入 adapter 测试。
- `filterOperate(op, item, false, "drawer")` 仍是业务可见性根源，避免重新定义权限。

风险点：

- `operations.value` 可能包含动态运行时 action，adapter 不能要求静态全量枚举。
- 别名编辑固定位置不可被用户排序覆盖，否则会回归已记录的别名入口问题。

验证方式：

- 单元脚本覆盖空 item、普通 item、锁定 item、别名 action 插入、用户 order 保留。
- 手动验证右键抽屉菜单顺序与旧版本一致。

### P2 入口和执行统一

修改文件：

- [src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:1290)
- [src/cpns/ClipDrawerMenu.vue](../../../src/cpns/ClipDrawerMenu.vue:138)

预期改动：

- 抽出 `selectDrawerActionByIndex(index, meta)`，鼠标点击、抽屉数字命令、列表层 `list.drawerSub.N` 共用。
- 明确 `sub` 语义：Shift 只影响抽屉层数字选择；列表层 `list.drawerSub.N` 保持当前 `sub: false`，除非产品确认要扩展。
- 右键打开后移动到下一项的行为保持不变，避免影响高频复制流。

风险点：

- 右键打开时 active item 与右键 item 的关系目前依赖 `activeIndex.value = currentIndex`，不可改成异步后取值。
- 抽屉外右键关闭监听在 [src/cpns/ClipDrawerMenu.vue](../../../src/cpns/ClipDrawerMenu.vue:87)，新入口不能误触发立即关闭。

验证方式：

- 右键当前行打开抽屉。
- 点击抽屉第 N 项执行同一 action。
- 数字快捷执行与鼠标点击顺序一致。
- 右键打开后列表仍移动到下一项。

### P3 设置页“右键菜单”统一管理

修改文件：

- [src/views/Setting.vue](../../../src/views/Setting.vue:587) 附近的“命令与动作”配置区。
- 可能新增轻量组件 `src/cpns/ContextMenuActionTable.vue`，仅在现有设置页风格内嵌。

预期改动：

- 新增“右键菜单”管理入口，展示 action id、标题、来源、风险、默认序号、当前序号。
- 支持恢复默认排序；拖拽排序可复用当前抽屉行为或先提供只读审计表。
- 每个 action 链接到对应 command 快捷键行；没有直接 command 的 action 显示“由抽屉序号执行”。

风险点：

- 设置页是紧凑工具页，不做大卡片化重排。
- 不在本阶段引入批量隐藏/删除 action，避免改变业务能力可见性。

验证方式：

- 设置页能看到右键 action 列表。
- 恢复默认后 `drawer.order` 清空或回到默认。
- 修改排序后右键抽屉和数字执行同步。

### P4 审验与文档回写

修改文件：

- 本文档。
- 必要时更新 [vibe/specs/260610-shortcuts-redesign/10YG2-zz-audit-快捷键命令系统一致性清单.ad](../260610-shortcuts-redesign/10YG2-zz-audit-快捷键命令系统一致性清单.ad:27) 的“右键统一管理”状态。

验证方式：

- `node test-shortcut-command-system.js`
- `pnpm run build`
- Markdown 链接审计。
- 至少一次浏览器手动路径：右键打开、拖拽排序、数字执行、设置页恢复默认。

## 执行评估

| 阶段 | 建议执行 | 原因 |
|---|---|---|
| P1 | 先执行 | 低风险，能先锁定菜单模型，后续 UI 和快捷键共用 |
| P2 | P1 后执行 | 依赖统一选择函数，改动集中但涉及高频交互 |
| P3 | P1/P2 验证后执行 | 涉及设置页 UI，需要已有模型稳定 |
| P4 | 每阶段滚动执行 | 防止旧审计文档继续标记过期状态 |

当前不建议直接一次性完成 P1-P3。右键是主路径高频交互，先做模型和执行统一，再扩展设置页，回归面更可控。

## 进度

| 时间 | 状态 | 内容 |
|---|---|---|
| 2026-06-12 | 已完成 | 规则加载、代码定位、现状评估、计划文档生成 |
| 2026-06-12 | 已完成 | P1 菜单模型统一：[src/global/contextMenuActions.js](../../../src/global/contextMenuActions.js:1) 新增右键 action 模型，覆盖排序、别名插入、快捷键摘要 |
| 2026-06-12 | 已完成第一阶段 | P2 入口和执行统一：右键抽屉渲染与列表层数字执行共用 [src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:1266) 的 `getDrawerFullMenuItems()`；序号选择统一由 [src/global/contextMenuActions.js](../../../src/global/contextMenuActions.js:103) 解析 |
| 2026-06-12 | 已完成第一阶段 | P3 设置页统一管理：[src/views/Setting.vue](../../../src/views/Setting.vue:776) 新增右键菜单弹窗，可查看 action、风险、来源、快捷键入口，支持拖拽排序并恢复默认顺序 |
| 2026-06-12 | 已完成 | P4 最终审验与旧审计状态回写 |

## 最终审验标准

- 行为一致：右键、键盘打开抽屉、抽屉数字选择、列表数字子动作看到并执行同一 action 顺序。
- 可配置：用户可查看右键 action，并恢复默认排序。
- 可回退：未改动 SQLite schema，`drawer.order` 旧数据继续可读。
- 可验证：自动测试覆盖纯菜单模型，构建通过，浏览器路径无未捕获异常。
- 文档闭环：本计划进度、快捷键重构审计和全景文档状态同步。

## 本轮审验

- 已审验：现有右键入口、抽屉菜单数据源、数字命令执行、旧审计结论。
- 已执行：P1 菜单模型统一、P2 第一阶段执行同源、P3 设置页只读统一管理与恢复默认、P4 文档回写。
- 自动验证：`node test-shortcut-command-system.js` 覆盖右键 action 模型、序号选择和越界；`pnpm run build` 通过。
- 浏览器验证：授权启动 `pnpm exec vite --host 127.0.0.1 --port 8098` 后，用 Playwright CLI 打开设置页“功能配置”，确认显示“右键菜单 18 项，8 项可直接跳转到 command 快捷键”，点击“右键菜单”后弹窗展示 18 项；“别名编辑”固定第 2 位，带“写入”标记和 `F2` 快捷键入口；可排序项显示拖拽柄，别名行显示“固定”；无自定义顺序时“恢复默认顺序”禁用。截图：[.playwright-cli/page-2026-06-11T23-28-38-123Z.png](../../../.playwright-cli/page-2026-06-11T23-28-38-123Z.png)。
- 已清理：Playwright 会话 `ez-rightclick` 已关闭，Vite dev server PID 已 kill。
