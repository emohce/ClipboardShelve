# 热键与多选/搜索修复 — 核验说明

**基线**: 2026-01-29，热键注册表重构及 toFix.md 中四项修复完成后的代码状态。  
**范围**: 代码与配置核验 + 手动执行效果核验清单。

---

## 1. 代码核验结果（与 toFix 对应）

### 1.1 清除层 Tab / Shift+Tab

- **配置**: `src/global/hotkeyBindings.js` 第 15–16 行  
  - `{ layer: 'clear-dialog', shortcutId: 'Tab', features: ['clear-dialog-tab'] }`  
  - `{ layer: 'clear-dialog', shortcutId: 'shift+Tab', features: ['clear-dialog-tab'] }`  
- **行为**: 清除弹窗层已绑定 Tab 与 shift+Tab，由同一 feature 处理，handler 内根据 `e.shiftKey` 反向移动，选项同步选中由该 feature 实现。

### 1.2 普通层空格触发多选

- **配置**: `src/global/hotkeyBindings.js` 第 76 行  
  - `{ layer: 'main', shortcutId: 'Space', features: ['list-space'] }`  
- **归一化**: `src/global/shortcutKey.js` 第 12、20 行  
  - `KEY_ALIAS = { ' ': 'Space' }`，`eventToShortcutId` 中 `e.key === ' '` 会生成 `'Space'`，与绑定一致。

### 1.3 多选普通删除后保留“上锁项”选中样式与高亮

- **选中恢复**: `src/cpns/ClipItemList.vue`  
  - `selectedItemIds`（约 544 行）：多选普通删除前，将**保留项**的 id 写入（约 817 行 `toKeep.map(item => item.id)`）。  
  - `restoreSelection()`（约 553–561 行）：根据 `selectedItemIds` 从新 `showList` 中取同 id 项写回 `selectItemList`，保证新引用下选中样式一致。  
- **高亮恢复**: 约 546、549、665–676、819–822 行  
  - 删除前把当前高亮项 id 与 index 存到 `pendingHighlightedItemId`、`pendingActiveIndexAfterDelete`；  
  - `watch(props.showList)` 中先 `restoreSelection()`，再若高亮项仍在列表则设 `activeIndex` 为其新下标，否则 `activeIndex = Math.min(oldIdx, newList.length - 1)`。

### 1.4 搜索状态下 ctrl+del / ctrl+backspace 后保留查询与搜索状态

- **逻辑**: `src/views/Main.vue` 约 810–855 行  
  - `search-delete-normal`、`search-delete-force` 仅执行：筛选候选、删除、`handleDataRemove()`、`adjustActiveIndexAfterDelete(0)`、ElMessage。  
  - **未**对 `filterText`、`isSearchPanelExpand` 赋值，**未**调用 `window.focus()`，故关键字与搜索面板状态保留。

---

## 2. 手动核验清单（执行效果）

在 `npm run serve` 后于浏览器或 uTools 加载的页面中逐项操作验证。

| 序号 | 场景 | 操作 | 预期 |
|-----|------|------|------|
| 1 | 清除层 Tab | 主界面按 Shift+Delete 打开清除弹窗 → 按 Tab | 选项焦点顺序下移，当前选项高亮/选中同步 |
| 2 | 清除层 Shift+Tab | 同上弹窗 → 按 Shift+Tab | 选项焦点顺序上移，当前选项高亮/选中同步 |
| 3 | 普通层空格多选 | 列表有焦点时按空格 | 当前项进入/退出多选，焦点自动下移一条 |
| 4 | 多选普通删除 + 样式 | 多选若干条（含上锁与未锁）→ 普通删除（Delete/Backspace） | 未锁被删；上锁且未删的项仍为选中样式，选中数量与样式一致 |
| 5 | 多选普通删除 + 高亮 | 同上，高亮在某条未锁项上执行普通删除 | 高亮移至下一条（或列表变短时最后一条）；若高亮在上锁项则保持或按规则移动 |
| 6 | 搜索 ctrl+del 保留状态 | 打开搜索、输入关键字 → Ctrl+Delete 删除匹配结果 | 删除成功提示；搜索框内容与搜索面板展开状态不变 |
| 7 | 搜索 ctrl+backspace 保留状态 | 同上，改用 Ctrl+Backspace | 同上 |
| 8 | 搜索 ctrl+shift+del 保留状态 | 同上，改用 Ctrl+Shift+Delete 强制删除 | 同上（关键字与搜索状态保留） |

---

## 3. 非本次范围（不核验）

- 其他 Tab 页（alt+1~9、抽屉 ctrl+1~9 等）的既有行为未改，不在此次核验内。  
- 热键冲突、与 uTools 宿主快捷键的优先级未在本文档核验。

完成上表 1–8 项且与预期一致，可视为本次修复执行效果核验通过。
