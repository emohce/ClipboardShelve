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
  用户未主动调整尺寸时，插件默认打开的窗口大小（**macOS 上 uTools 内嵌插件窗为首要场景**，独立拉大窗口或仅浏览器全屏 **不是**默认验收环境）。列表区有效高度 **远小于**常见桌面浏览器窗口；**图片类**列表项默认约 **2×** 单行文字条目的行高，描述「一屏可见量」时需区分 **条目数**（约 **6 条**量级）与 **等效行/栅格**（约 **12 行**量级），勿混用两个数字。涉及滚动、布局、可见区域时优先在该环境下考虑。见 [EM-2026-04-16-utools-default-window-list-visibility](ai-error-memory/2026-04-16-utools-default-window-list-visibility.md)。

- `alias material`（别名落盘缓存）
  为「按别名粘贴为文件」而在磁盘上生成的真实文件及其元数据目录，位于 `userData/.../alias-material/<条目 id>/`，与仅存在内存/剪贴板中的图片数据区分；与 `item.alias.map` 中的**别名文本**持久化相互独立又通过 `itemId` 关联。见 [EM-2026-04-10-alias-material-lifecycle](ai-error-memory/2026-04-10-alias-material-lifecycle.md)。

- `item.alias.map`
  `utools.dbStorage` 中键名 `item.alias.map` 存储的「条目 id → 别名字符串」映射；删除条目或改别名时需与 `alias material` 清理策略对齐，避免孤儿映射或孤儿文件。

- `F2` / `list-tag-edit` 双分支
  主列表上同一快捷键绑定 feature `list-tag-edit`（[`src/global/hotkeyBindings.js`](../../src/global/hotkeyBindings.js)）。在 [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue) 中按 `window.db.isCollected(item.id)` 分支：**已收藏** → `openTagEdit`（标签/备注编辑弹层）；**未收藏** → `saveAliasForItem`（别名新增/更新）。用户向表述：**不是「仅在收藏 tab」**，只要当前选中条目属于已收藏数据，`F2` 即走标签编辑。
