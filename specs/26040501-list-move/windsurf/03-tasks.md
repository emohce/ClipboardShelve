# Tasks: 移动效果优化

基于 `02-plan.md` 的原子任务分解

---

## T1: 单步滚动可见性优化
**状态**: pending

**目标**: 单击上下键时，若 item 已可见则不滚动

**修改文件**: `src/cpns/ClipItemList.vue`

**具体改动**:
1. 修改 `setKeyboardActiveIndex` 函数，新增 `skipIfVisible` 选项
2. 修改 `registerFeature("list-nav-up")`，单步移动使用 `block: "nearest"` 并启用可见性判断
3. 修改 `registerFeature("list-nav-down")`，同上

**验证标准**:
- 单击 ↑/↓ 时，可见 item 不触发滚动
- 不可见 item 滚动到可视区域

---

## T2: 长按分页逻辑重构
**状态**: pending

**目标**: 长按上下键复用分页逻辑，按页步进并居中

**修改文件**: `src/cpns/ClipItemList.vue`

**具体改动**:
1. 修改 `startKeyHoldAutoScroll` 函数：
   - 使用 `getPageStep()` 计算步进距离
   - 每次跳转使用 `setKeyboardActiveIndex(targetIndex, { block: "center" })`
2. 移除原有的逐项强行居中逻辑

**验证标准**:
- 长按超过 300ms 后按页跳转
- 每次跳转后选中项居中
- 滚动间隔随时间加速

---

## T3: 删除后选中状态修复
**状态**: pending

**目标**: 修复删除 item 后选中效果错乱问题

**修改文件**: `src/cpns/ClipItemList.vue`

**具体改动**:
1. 修复 `watch(() => props.showList)` 中的删除后处理逻辑：
   - 确保 `pendingHighlightedItemId` 在找不到时正确回退到索引计算
   - 修复 `activeIndex` 与渲染不一致的问题
2. 优化 `registerFeature("list-delete")` 中的删除后导航逻辑

**验证标准**:
- 删除 item 后自动选中下一项（同一索引位置）
- 删除最后一项后选中前一项
- 页面不闪烁、不割裂

---

## T4: 锁状态即时更新
**状态**: pending

**目标**: 锁定操作后图标状态立即更新，不等移动选中

**修改文件**: 
- `src/cpns/ClipItemRow.vue`
- `src/cpns/ClipItemList.vue`

**具体改动**:
1. 检查 `ClipItemRow.vue` 中 `locked` prop 是否正确绑定
2. 检查 `ClipItemList.vue` 中 `v-memo` 是否包含 `item.locked`
3. 确保批量锁定时所有选中项同时更新

**验证标准**:
- 按锁定快捷键后图标立即变化
- 批量锁定时所有项同时更新

---

## T5: 图标布局优化
**状态**: pending

**目标**: 锁/收藏图标不换行，内容自动缩略

**修改文件**: `src/style/cpns/clip-item-row.less`

**具体改动**:
1. 图标容器添加 `flex-shrink: 0` 和 `max-width` 限制
2. 内容区域添加 `min-width: 0` 和 `text-overflow: ellipsis`
3. 确保单行渲染性能，300ms 内完成

**验证标准**:
- 图标不换行
- 长文本自动缩略
- 布局不崩

---

## T6: 综合验证与回归测试
**状态**: pending

**目标**: 整体功能验证，确保无回归

**验证清单**:
- [ ] 构建通过 `pnpm run build`
- [ ] 长按分页居中正确
- [ ] 单步可见性判断正确
- [ ] 删除后选中正确
- [ ] 锁状态即时更新
- [ ] 图标布局正常
- [ ] 筛选/搜索状态下移动正常
- [ ] 快速操作不丢响应

---

## 执行顺序

```
T1 ──┐
     ├──→ T3 ──┐
T2 ──┘        ├──→ T6 (验证)
T4 ──→ T5 ────┘
```

**建议执行顺序**: T1 → T2 → T3 → T4 → T5 → T6
