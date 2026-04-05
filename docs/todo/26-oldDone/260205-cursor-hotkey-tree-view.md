# 快捷键树形展示功能实现文档

## 基线说明

### 当前热键系统架构

- **快捷键绑定定义**: `src/global/hotkeyBindings.js`
  - `HOTKEY_BINDINGS`: 源数据数组，定义所有快捷键绑定
  - `getEffectiveBindings()`: 应用用户覆盖后的绑定列表

- **运行时分发**: `src/global/hotkeyRegistry.js`
  - `registerFeature(featureId, handler)`: 注册功能处理器
  - `dispatch(e)`: 键盘事件分发，按 layer 栈优先级匹配并调用 handler
  - handler 返回 `true` 则阻断后续处理

- **Layer 栈管理**: `src/global/hotkeyLayers.js`
  - `activateLayer(name)` / `deactivateLayer(name)`: 推入/弹出 layer
  - `getCurrentLayer()`: 返回栈顶 layer

- **显示标签**: `src/global/hotkeyLabels.js`
  - `LAYER_LABELS`: layer 中文标签
  - `FEATURE_LABELS`: feature 中文标签
  - `getLayerLabel(layer, state)` / `getFeatureLabel(featureId)`: 获取标签

### 原有设置页展示方式

- **位置**: `src/views/Setting.vue` 的"快捷键"标签页
- **实现**: `shortcutDisplayRows` computed 属性
  - 使用 `HOTKEY_BINDINGS` 作为数据源
  - 在循环内用 `hotkeyOverrides` 过滤（null 剔除）和覆盖显示键
  - 按 `shortcutId` 分组，扁平表格展示
  - 组件: `SettingPagedTable`

## 新增模块说明

### 1. hotkeyGraph.js

**位置**: `src/global/hotkeyGraph.js`

**功能**: 将扁平绑定列表转换为树形结构

**核心函数**:
- `buildHotkeyTree(bindings)`: 从 `getEffectiveBindings()` 结果构建树，根为 `main(normal)` 层
- `getBindingsForLayer(layer, state, bindings)`: 辅助查询函数

**数据结构**:
```javascript
// LayerNode
{
  layer: 'main',
  state: null,
  shortcuts: [
    {
      shortcutId: 'ctrl+f',
      features: ['main-focus-search'],
      children: [] // 无子层
    },
    {
      shortcutId: 'shift+Delete',
      features: ['open-clear-dialog'],
      children: [
        {
          layer: 'clear-dialog',
          state: null,
          shortcuts: [ /* 该 layer 下的快捷键 */ ]
        }
      ]
    }
  ]
}
```

**Feature → Layer 映射**:
- `open-clear-dialog` → `clear-dialog`
- `list-drawer-open` → `clip-drawer`
- `list-view-full` → `full-data-overlay`
- `list-enter` → `full-data-overlay`
- `list-tag-edit` → `tag-edit`
- `tag-search` → `tag-search`

**算法要点**:
- 从根 `(layer='main', state=null)` 开始
- 收集该层/状态的绑定，按 `shortcutId` 分组
- 对每个 feature，查表判断是否激活新 layer
- 递归构建子层节点，使用 `visited` Set 防止循环

### 2. HotkeyTreeView 组件族

**组件结构**:
- `HotkeyTreeView.vue`: 主容器，管理展开状态
- `HotkeyTreeViewLayer.vue`: 层节点组件（递归）
- `HotkeyTreeViewShortcut.vue`: 快捷键节点组件（递归）

**交互特性**:
- 根层（main）默认展开
- 其他层节点和快捷键节点可点击 `+/-` 展开/折叠
- 快捷键节点显示: `shortcutId` + `[Layer标签-Feature标签]` 描述
- 有子层的快捷键节点可展开显示后续层级

**样式**:
- 使用项目 CSS 变量（`--text-color`, `--primary-color` 等）
- 缩进表示层级，左侧边框线连接父子节点
- 快捷键键名使用等宽字体，带背景色高亮

### 3. Setting.vue 集成

**变更**:
- 导入 `getEffectiveBindings`、`buildHotkeyTree`、`HotkeyTreeView`
- 移除 `shortcutDisplayRows` computed，新增 `hotkeyTreeRoot` computed
- 移除 `shortcutColumns` 定义
- 用 `HotkeyTreeView` 替换 `SettingPagedTable`
- 新增 `shortcutCount` computed 统计快捷键总数

**数据源**:
- 使用 `getEffectiveBindings()` 而非 `HOTKEY_BINDINGS`，统一体现用户覆盖

## 交互说明

### 树形结构示例

```
主界面
  ├─ Tab → [主界面-左右切换分页]
  ├─ ctrl+f → [主界面-聚焦搜索]
  ├─ shift+Delete → [主界面-打开清除记录对话框]
  │   └─ 清除对话框
  │       ├─ Escape → [清除对话框-关闭清除对话框]
  │       ├─ Enter → [清除对话框-确认清除]
  │       └─ 1～5 → [清除对话框-清除 X 小时内/全部]
  ├─ ArrowRight → [主界面-打开操作抽屉]
  │   └─ 剪贴板抽屉
  │       ├─ Escape → [剪贴板抽屉-关闭抽屉]
  │       ├─ ArrowDown/Up → [剪贴板抽屉-抽屉内向下/上选择]
  │       └─ ctrl+1～9 → [剪贴板抽屉-抽屉内选第 X 项]
  └─ ...
```

### 展开/折叠操作

1. **根层（主界面）**: 默认展开，不可折叠
2. **子层节点**: 点击层名左侧 `+/-` 图标展开/折叠
3. **快捷键节点**: 
   - 无子层: 仅显示快捷键和功能描述
   - 有子层: 点击快捷键行左侧 `+/-` 展开显示后续层级

## 测试检查清单

### 正常流测试

- [ ] 主界面各常用快捷键在树中可见
  - `ctrl+f` (聚焦搜索)
  - `ArrowUp/Down` (上/下移选择)
  - `Enter` (复制选中项)
  - `shift+Delete` (打开清除对话框)
  - `ArrowRight` (打开操作抽屉)
  - `F2` (标签编辑)
  - `ctrl+alt+f` / `ctrl+shift+f` (标签搜索)

- [ ] 树形结构正确展示层级关系
  - 根层为"主界面"
  - `shift+Delete` 下展开显示"清除对话框"层
  - `ArrowRight` 下展开显示"剪贴板抽屉"层
  - `ArrowLeft` / `list-enter` 下展开显示"全文预览"层
  - `F2` 下展开显示"标签编辑"层
  - `ctrl+alt+f` / `ctrl+shift+f` 下展开显示"标签搜索"层

- [ ] 快捷键描述格式正确
  - 显示格式: `[Layer标签-Feature标签]`
  - 多个 feature 用空格分隔

### Edge 测试

- [ ] 搜索态快捷键展示
  - `main(state=search)` 下的快捷键（如 `ctrl+Delete`）应在树中正确展示
  - 注意：当前树根为 `main(state=null)`，搜索态快捷键不在根层，需确认是否需要在树中单独展示

- [ ] 多选态快捷键
  - 当前树根为 `main(state=null)`，多选态快捷键不在根层

- [ ] 阻断配置（`shortcutId: '*'`）
  - 不应出现在树中（已过滤）

### 权限/阻断测试

- [ ] 用户覆盖的快捷键正确显示
  - 使用 `getEffectiveBindings()` 后，用户覆盖的快捷键应在树中体现
  - 被移除的快捷键（`override: null`）不应出现

### 回归测试

- [ ] 实际快捷键触发行为不变
  - 树形展示仅影响 UI，不影响 `hotkeyRegistry` 的事件处理
  - 所有快捷键功能正常工作
  - Layer 激活/去激活逻辑正常
  - 事件阻断逻辑正常

### UI/UX 测试

- [ ] 展开/折叠交互流畅
- [ ] 样式与设置页其他部分一致
- [ ] 快捷键键名清晰可读
- [ ] 功能描述完整显示（无截断）
- [ ] 响应式布局正常（不同窗口大小）

## 文件变更清单

### 新增文件

- `src/global/hotkeyGraph.js`: 树形结构构建模块
- `src/cpns/HotkeyTreeView.vue`: 树形展示主组件
- `src/cpns/HotkeyTreeViewLayer.vue`: 层节点组件
- `src/cpns/HotkeyTreeViewShortcut.vue`: 快捷键节点组件
- `docs/260205-cursor-hotkey-tree-view.md`: 本文档

### 修改文件

- `src/global/hotkeyLabels.js`: 补全 `tag-search`、`tag-edit` 的 layer labels
- `src/views/Setting.vue`: 用树形展示替换表格展示

### 未修改文件（保持原有逻辑）

- `src/global/hotkeyBindings.js`: 绑定定义不变
- `src/global/hotkeyRegistry.js`: 事件分发逻辑不变
- `src/global/hotkeyLayers.js`: Layer 栈管理不变
- `src/global/shortcutKey.js`: 快捷键规范化不变

## 后续扩展建议

1. **搜索态/多选态快捷键展示**: 当前树根为 `main(normal)`，可考虑在根层下增加 `main(state=search)` 和 `main(state=multi-select)` 子节点
2. **快捷键编辑功能**: 如需编辑快捷键，可在快捷键节点右侧添加"编辑"按钮，复用原有覆盖逻辑
3. **快捷键搜索**: 可在树形展示上方添加搜索框，过滤匹配的快捷键
4. **展开/折叠全部**: 添加"展开全部"/"折叠全部"按钮
