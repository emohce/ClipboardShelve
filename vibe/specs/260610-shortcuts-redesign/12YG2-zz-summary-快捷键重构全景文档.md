= 快捷键重构全景文档

Tool: codex

== 结论

快捷键重构已经从“按键到 feature 的分层映射”升级为“command + keybinding + when + resolver + SQLite/fallback + macro”的可运行体系。当前核心闭环包括：

- 需求闭环：覆盖 command 主体、when 条件、冲突判断、用户改键、恢复默认、禁用、SQLite 分层、设置页工作台和组合命令扩展。
- 技术闭环：运行时 dispatch 已由 resolver 命中 command-aware binding；业务组件已通过 command/feature pair 注册；SQLite 快捷键表和 setting fallback 并行；组合命令已接入运行时快捷键执行。
- UI 闭环：设置页已有 command 表格、搜索、筛选、风险标记、存储来源状态、录制改键、When 图形/文本双模式、组合命令列表、草稿编辑和右键菜单审计入口。
- 剩余非终局项：macro 暂只允许非写入 command，且缺少冲突前置合并视图；复杂 AST 可视化和 uTools 生产壳首次迁移验证仍是后续增强项。审计文档已同步 macro dispatch 与右键统一第一阶段状态。

== 文档来源

- 原始需求：[7YG2-zz-raw-快捷键重构.ad](7YG2-zz-raw-快捷键重构.ad:1)
- 需求理解：[8YG2-zz-analysis-快捷键命令系统重构理解.ad](8YG2-zz-analysis-快捷键命令系统重构理解.ad:1)
- 实施计划与进度：[9YG2-zz-plan-快捷键命令系统重构实施计划.ad](9YG2-zz-plan-快捷键命令系统重构实施计划.ad:1)
- 一致性清单：[10YG2-zz-audit-快捷键命令系统一致性清单.ad](10YG2-zz-audit-快捷键命令系统一致性清单.ad:1)
- SQLite 迁移设计：[11YG2-zz-plan-快捷键SQLite迁移设计.ad](11YG2-zz-plan-快捷键SQLite迁移设计.ad:1)

== 原始需求抽象

原始诉求不是“快捷键 UI 美化”，而是一次系统模型升级：

- 把旧 feature 抽象为 command，每个 command 有 id、备注、when、source、默认快捷键和恢复默认能力。
- 用 when 表达式替代隐式 layer/state 优先级，让普通、搜索、预览、多选、浮窗、侧栏等状态显式化。
- 冲突判断从“快捷键字符串相同”升级为“key 相同且 when 可能同时为真”。
- 设置页按 VS Code 快捷键页思路重构，支持搜索、编辑、备注、恢复默认和 when 管理。
- 默认数据与用户数据分层：系统默认固定，用户 override 进入 SQLite，并保留 fallback。
- 为组合 command 预留扩展点，支持后续串行、延迟、并行或状态穿透。

这些需求背后的真实目标是：让快捷键从“散落的交互细节”变成“可观察、可编辑、可迁移、可扩展的命令系统”。

== 方案演进

=== 旧模型

旧模型以 `layer + state + shortcutId -> features` 为中心，默认绑定声明在 [src/global/hotkeyBindings.js](../../../src/global/hotkeyBindings.js:90)。它的优点是简单稳定，缺点是：

- feature 缺少可展示元信息，设置页只能做弱解释。
- layer/state 是隐式上下文，无法表达 `mainFocus && !inputFocus` 这类组合条件。
- 用户改键只能覆盖旧 binding key，难以支撑 command 级恢复默认、冲突解释和版本迁移。
- 冲突判断无法证明“同键不同上下文可共存”。

=== 新模型

新模型拆成五个层次：

- Command：可执行能力主体，定义在 [src/global/commandDefaults.js](../../../src/global/commandDefaults.js:12)，并通过 [src/global/commandDefaults.js](../../../src/global/commandDefaults.js:110) 生成 `id/title/category/description/risk/source`。
- Keybinding：快捷键到 command 的绑定，旧 binding 通过 [src/global/commandDefaults.js](../../../src/global/commandDefaults.js:145) 转成 command-aware binding。
- When：可求值的上下文表达式，解析与求值在 [src/global/whenExpression.js](../../../src/global/whenExpression.js:1)。
- Resolver：按 key、when、source、overlay、specificity、weight 选中最终 binding，逻辑在 [src/global/keybindingResolver.js](../../../src/global/keybindingResolver.js:53)。
- Store：SQLite 优先读写，setting fallback 兜底，入口在 [src/global/shortcutStore.js](../../../src/global/shortcutStore.js:28)。

=== 设计取舍

- 不推倒旧 feature handler。旧 feature 先作为 command handler 的兼容 fallback，降低业务回归面。
- 不把业务 guard 全部挪到 when。删除、强删、锁定、空数据、IME、多选边界继续留在 handler 内。
- 不把 SQLite 变成启动硬依赖。SQLite 失败时继续使用 `setting.hotkeyOverrides`。
- 不在第一版做完整图形化 when 构建器。先用文本编辑、语法校验和预设按钮验证模型。
- 组合命令默认禁止 data-write command，避免副作用被批量放大。

== 执行分层

=== 1. Command 元数据层

命令定义集中在 [src/global/commandDefaults.js](../../../src/global/commandDefaults.js:12)。它把原 feature 映射为 command，并显式标记高风险写入类命令，例如删除、强删、清空、保存、锁定、置顶等。

动态数字命令通过循环生成，覆盖抽屉选择、主 tab、快速复制和抽屉子动作：[src/global/commandDefaults.js](../../../src/global/commandDefaults.js:101)。

旧 feature 到 command 的映射由 [src/global/commandDefaults.js](../../../src/global/commandDefaults.js:120) 生成，保证旧 binding 能无损进入新模型。

=== 2. When 表达式层

When 语言支持：

- 布尔 key：`mainFocus`
- 取反：`!inputFocus`
- 与/或：`&&`、`||`
- 括号
- 字符串和布尔 literal
- 相等/不等比较：`==`、`!=`

解析器和求值器分别在 [src/global/whenExpression.js](../../../src/global/whenExpression.js:20) 与 [src/global/whenExpression.js](../../../src/global/whenExpression.js:127)。冲突判断需要的 literal set 由 [src/global/whenExpression.js](../../../src/global/whenExpression.js:165) 提供。

=== 3. 冲突判断层

冲突判断不是简单比较 key，而是先用互斥上下文排除不可能同时发生的状态，再判断 when 是否可能重叠。互斥组定义在 [src/global/keybindingConflicts.js](../../../src/global/keybindingConflicts.js:3)，核心判断在 [src/global/keybindingConflicts.js](../../../src/global/keybindingConflicts.js:27)。

这让同一个 key 可以安全复用在主界面、设置页、弹窗、抽屉和预览层，只要 when 不重叠。

=== 4. Dispatch 与注册层

运行时已经优先执行 command handler，缺失时 fallback 到 feature handler：

- command 注册入口：[src/global/hotkeyRegistry.js](../../../src/global/hotkeyRegistry.js:64)
- command 执行入口：[src/global/hotkeyRegistry.js](../../../src/global/hotkeyRegistry.js:77)
- command/feature 双注册 helper：[src/global/hotkeyRegistry.js](../../../src/global/hotkeyRegistry.js:95)
- dispatch 主路径通过 resolver 命中 binding：[src/global/hotkeyRegistry.js](../../../src/global/hotkeyRegistry.js:376)
- handler 执行与阻止默认行为处理：[src/global/hotkeyRegistry.js](../../../src/global/hotkeyRegistry.js:385)

输入保护仍保留在 dispatch 层：设置页 Del/Backspace 和输入控件聚焦直接放行，避免快捷键抢占文本编辑行为：[src/global/hotkeyRegistry.js](../../../src/global/hotkeyRegistry.js:345)。

=== 5. SQLite 与 fallback 层

快捷键表分为 command snapshot、keybinding snapshot、user override 三张表，schema 在 [src/storage/shortcutKeybindingRepository.js](../../../src/storage/shortcutKeybindingRepository.js:7)。

默认快照生成在 [src/storage/shortcutKeybindingRepository.js](../../../src/storage/shortcutKeybindingRepository.js:63) 和 [src/storage/shortcutKeybindingRepository.js](../../../src/storage/shortcutKeybindingRepository.js:82)，旧 `setting.hotkeyOverrides` 迁移在 [src/storage/shortcutKeybindingRepository.js](../../../src/storage/shortcutKeybindingRepository.js:179)。

SQLite 主仓库初始化时安全挂载快捷键 repository；失败只 warning 并回退 setting：[src/storage/sqliteClipboardRepository.js](../../../src/storage/sqliteClipboardRepository.js:232)。

保存时先写 setting 兼容副本，再尝试写 SQLite override，并触发热更新事件：[src/global/shortcutStore.js](../../../src/global/shortcutStore.js:133)。事务式替换 override 用于避免半写状态：[src/storage/shortcutKeybindingRepository.js](../../../src/storage/shortcutKeybindingRepository.js:264)。

=== 6. 设置页 UI 层

设置页快捷键 tab 已从旧树形展示升级为 command keybinding 工作台：

- 头部显示命令数量与存储来源：[src/views/Setting.vue](../../../src/views/Setting.vue:130)
- 搜索支持 command、动作、键位、when、来源和作用域：[src/views/Setting.vue](../../../src/views/Setting.vue:150)
- 筛选包含全部、主界面、弹窗层、已修改、高风险：[src/views/Setting.vue](../../../src/views/Setting.vue:160)
- 表格展示 command、快捷键、when、来源、风险和操作：[src/views/Setting.vue](../../../src/views/Setting.vue:203)
- 录制式改键弹窗：[src/views/Setting.vue](../../../src/views/Setting.vue:260)
- When 文本编辑弹窗：[src/views/Setting.vue](../../../src/views/Setting.vue:294)

表格数据由 store 统一生成，SQLite snapshot 可用时优先使用，fallback 时回退默认声明：[src/views/Setting.vue](../../../src/views/Setting.vue:963)。

功能配置页增加“命令与动作”入口，显示快捷键存储状态和组合命令状态：[src/views/Setting.vue](../../../src/views/Setting.vue:587)。功能到 command 的映射由 [src/global/shortcutCommandRows.js](../../../src/global/shortcutCommandRows.js:21) 显式维护，避免把动态抽屉动作误标成直接快捷键。

=== 7. 组合命令层

组合命令已从“预留扩展点”演进到“可配置、可存储、可运行”的状态。

宏命令 schema 约束：

- 仅支持 sequence 模式：[src/global/commandMacro.js](../../../src/global/commandMacro.js:3)
- 最多 12 步，每步 delay 最大 5000ms：[src/global/commandMacro.js](../../../src/global/commandMacro.js:4)
- 默认禁止 data-write command：[src/global/commandMacro.js](../../../src/global/commandMacro.js:35)
- 执行计划构建在 [src/global/commandMacro.js](../../../src/global/commandMacro.js:91)
- dry-run 在 [src/global/commandMacro.js](../../../src/global/commandMacro.js:151)
- 执行器在 [src/global/commandMacro.js](../../../src/global/commandMacro.js:227)

SQLite 存储表为 macro definitions 和 macro steps：[src/storage/commandMacroRepository.js](../../../src/storage/commandMacroRepository.js:4)。store 支持 SQLite 优先和内存草稿 fallback：[src/global/commandMacroStore.js](../../../src/global/commandMacroStore.js:32)。

运行时已经在 HotkeyProvider 中动态注册 macro command，并把 macro binding 合入快捷键表：[src/cpns/HotkeyProvider.vue](../../../src/cpns/HotkeyProvider.vue:43)。执行期间支持运行状态、取消请求、步骤状态和提示：[src/cpns/HotkeyProvider.vue](../../../src/cpns/HotkeyProvider.vue:52)。

设置页提供组合命令列表、运行状态、编辑、删除和新增草稿：[src/views/Setting.vue](../../../src/views/Setting.vue:645)。新增/编辑表单支持标题、快捷键、When、步骤、delay，并在保存时校验快捷键和 when：[src/views/Setting.vue](../../../src/views/Setting.vue:687)、[src/views/Setting.vue](../../../src/views/Setting.vue:1163)。

== 当前进度

| 模块 | 状态 | 证据 |
|---|---|---|
| Command 元数据 | 已完成第一阶段 | [src/global/commandDefaults.js](../../../src/global/commandDefaults.js:12) |
| 旧 feature 兼容 | 已完成 | [src/global/hotkeyRegistry.js](../../../src/global/hotkeyRegistry.js:95) |
| when parser/evaluator | 已完成文本版 | [src/global/whenExpression.js](../../../src/global/whenExpression.js:1) |
| resolver 接入 dispatch | 已完成 | [src/global/hotkeyRegistry.js](../../../src/global/hotkeyRegistry.js:376) |
| 冲突判断 | 已完成保守版 | [src/global/keybindingConflicts.js](../../../src/global/keybindingConflicts.js:27) |
| 设置页 command 表 | 已完成 | [src/views/Setting.vue](../../../src/views/Setting.vue:203) |
| 录制改键/禁用/恢复默认 | 已完成 | [src/global/shortcutCommandRows.js](../../../src/global/shortcutCommandRows.js:137) |
| SQLite 快捷键表 | 已完成 | [src/storage/shortcutKeybindingRepository.js](../../../src/storage/shortcutKeybindingRepository.js:7) |
| SQLite/fallback store | 已完成 | [src/global/shortcutStore.js](../../../src/global/shortcutStore.js:28) |
| 运行时 SQLite 优先 | 已完成 | [src/cpns/HotkeyProvider.vue](../../../src/cpns/HotkeyProvider.vue:136) |
| 组合命令 schema/store/UI | 已完成第一阶段 | [src/global/commandMacro.js](../../../src/global/commandMacro.js:1) |
| 组合命令快捷键执行 | 已完成第一阶段 | [src/cpns/HotkeyProvider.vue](../../../src/cpns/HotkeyProvider.vue:52) |
| 图形化 When 构建器 | 已完成第一阶段 | [src/global/whenBuilder.js](../../../src/global/whenBuilder.js:1) 提供上下文分组、预设、表达式生成和回填；[src/views/Setting.vue](../../../src/views/Setting.vue:294) When 弹窗支持图形/文本双模式 |

== 验证矩阵

已验证项：

- command 风险集合保持显式，避免 data-write 漏标：[test-shortcut-command-system.js](../../../test-shortcut-command-system.js:200)
- macro normalize、校验、执行计划、禁止 data-write 默认策略：[test-shortcut-command-system.js](../../../test-shortcut-command-system.js:214)
- SQLite 快捷键 snapshot、override 迁移、重复导入保护、真实 sql.js export/reload：[test-shortcut-command-system.js](../../../test-shortcut-command-system.js:1680)
- SQLite override 原子替换 rollback：[test-shortcut-command-system.js](../../../test-shortcut-command-system.js:1760)
- macro SQLite repository 真实 sql.js 持久化和 rollback：[test-shortcut-command-system.js](../../../test-shortcut-command-system.js:1776)
- 默认快捷键矩阵 legacy 与 command resolver 一致：[test-shortcut-command-system.js](../../../test-shortcut-command-system.js:2050)
- 用户 source 高于 system、command 优先于 feature fallback、纯 command 可执行：[test-shortcut-command-system.js](../../../test-shortcut-command-system.js:2060)
- data-write 改键后旧键失效、新键生效；禁用后不触发：[test-shortcut-command-system.js](../../../test-shortcut-command-system.js:2161)
- command/feature pair helper 无效输入保护：[test-shortcut-command-system.js](../../../test-shortcut-command-system.js:2252)
- When 构建器生成、回填、复杂表达式降级和冲突提示：[test-shortcut-command-system.js](../../../test-shortcut-command-system.js:861)

本轮复核已运行：

- `node test-shortcut-command-system.js`
- `pnpm run build`
- `python3 /Users/gdkmjd/work/czz/CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/scripts/audit_ai_rules.py . --mode project`

== 技术风险

- `registerCommandFeaturePair()` 的 disposer 当前只注销 command，不注销 feature fallback。测试中已经显式暴露该行为：[test-shortcut-command-system.js](../../../test-shortcut-command-system.js:2270)。这不是当前阻断项，但后续若频繁 mount/unmount 同名 feature，建议补齐成对清理策略。
- When 冲突判断是保守算法，无法证明安全时会倾向提示可能冲突。这符合安全默认值；复杂 AST 可视化仍作为后续体验优化，不影响当前图形/文本双模式闭环。
- macro 运行时接入和右键统一第一阶段状态已经同步到 [10YG2-zz-audit-快捷键命令系统一致性清单.ad](10YG2-zz-audit-快捷键命令系统一致性清单.ad:27)；后续风险集中在生产壳验证、复杂冲突预览和组合命令副作用边界。
- SQLite 快捷键已经有真实 sql.js 测试，但 uTools 生产壳首次迁移仍应做一次手工验证。

== UI 设计总结

本次 UI 的核心不是“展示更多配置项”，而是把复杂命令系统压缩成低认知成本的工作台。

关键策略：

- 密集但可扫描：表格承载 command、快捷键、when、来源、风险和操作，避免卡片化膨胀。
- 状态透明：SQLite/fallback、Macro SQLite/Draft 都在入口处直接展示，用户知道配置写到哪里。
- 危险可见：data-write command 用“写入”标记显式提示。
- 改键低摩擦：默认提供录制式输入，手动输入作为 fallback。
- When 先文本化：给高级用户完整表达力，同时用语法校验防止坏表达式落盘。
- 功能页联动 command：用户从“动作”视角进入，也能跳到 command 快捷键行，不要求理解内部 command id。
- 组合命令限制副作用：只允许非写入 command 进入组合，先保证可预测性。

== 设计思维哲学

=== 1. 先把能力命名，再给能力绑定入口

快捷键不是能力本身，只是能力的触发方式。先抽 command，后绑定 key，能让菜单、按钮、快捷键、组合命令共享同一能力主体。

=== 2. 上下文要显式，不要藏在调用顺序里

旧 layer/state 依赖查找顺序，维护者必须记住“谁盖住谁”。when 把触发条件写成可读表达式，让冲突、展示、迁移和测试都能围绕同一事实工作。

=== 3. 安全 guard 不应被配置语言吞掉

when 决定“是否尝试触发”，handler 决定“业务上是否允许执行”。删除、强删、清空、锁定这类数据写入必须在 handler 保留二次校验，不能因为配置系统变强就削弱业务边界。

=== 4. 兼容是重构的稳定器

保留 feature fallback、setting fallback 和旧 override shape，让系统可以分阶段切换。真正的重构不是一次性替换，而是让新旧模型在一段时间内可对照、可回退、可验证。

=== 5. 用户配置要分层，系统默认要可再生

系统默认是发布事实，用户 override 是个人事实。SQLite snapshot 让默认可查询、可展示、可迁移；override 表让用户修改可删除、可恢复、可回滚。

=== 6. 冲突判断要承认不确定性

复杂 when 表达式不一定能完全静态证明互斥。保守提示“可能冲突”比静默覆盖更符合用户信任，后续可通过图形化构建器降低误报。

=== 7. 高级能力先限制副作用，再开放表达力

组合命令一旦能串行执行，就会放大误操作。先禁用 data-write、限制步骤数和 delay，再观察真实使用，是比“功能一步到位”更可靠的演进路径。

=== 8. UI 是系统模型的解释器

设置页不是配置字段堆叠，而是把 command、keybinding、when、source、risk、storage mode 翻译成用户能理解的工作台。好的 UI 不隐藏复杂性，而是把复杂性排列成可扫描、可判断、可撤销的结构。

== 后续建议

1. 更新 [10YG2-zz-audit-快捷键命令系统一致性清单.ad](10YG2-zz-audit-快捷键命令系统一致性清单.ad:28)，把 macro dispatch 状态改为“已接入第一阶段运行时执行”。
2. 为 `registerCommandFeaturePair()` 增加可选 feature 清理或引用计数，避免 fallback handler 残留。
3. 做一次 uTools 真实壳验证：首次启动迁移、改键保存、重启后 SQLite override 生效、fallback 分支提示。
4. 设计图形化 When 构建器：基于现有 AST 和互斥组，不另起一套字符串拼接逻辑。
5. 将 macro 快捷键加入设置页冲突预览，统一展示 command binding 与 macro binding 的 key/when 重叠关系。
