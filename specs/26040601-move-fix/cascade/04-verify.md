# 验证记录

## 构建验证
- 命令：`pnpm run build`
- 结果：⚠️ Vite 打包完成（transform/render 成功），`closeBundle` 复制 `public/plugin.json` 时报 **ENOENT**（当前工作区 `public/` 下无 `plugin.json`），属环境/仓库快照问题，与本次逻辑改动无关。补全 `public/plugin.json` 后应可通过。
- 时间：2026-04-06

## 代码变更（BjVkZ-zt-move 落地）

### 长按分页单次滚动
- **文件**：`src/hooks/useVirtualListScroll.js`
- **内容**：新增 `getPageTargetIndex`、`getHalfPageTargetIndex`；`scrollByPage` / `scrollHalfPage` 复用上述计算。
- **文件**：`src/cpns/ClipItemList.vue`
- **内容**：`runPageNavigation(..., { center: true })` 仅用 `getPageTargetIndex` + `setKeyboardActiveIndex(center)`，避免先 `end/start` 再居中的双重滚动。

### 底部无更多数据兜底
- **文件**：`src/cpns/ClipItemList.vue` — `startAutoScroll` 在 `loadMore` 后长度未增加时调用 `scrollHalfPage` 再停止。

### 删除恢复统一为 deleteAnchor
- **文件**：`src/cpns/ClipItemList.vue`
- **内容**：删除前 `setDeleteAnchor({ anchorIndex, preferItemId })`；`watch(showList)` 唯一恢复高亮并 `scrollActiveNodeIntoView`；`list-delete` / `list-force-delete` 均设置 anchor；暴露 `prepareDeleteRecovery`。
- **文件**：`src/views/Main.vue`
- **内容**：搜索批量删除、强制搜索删除、收藏页强制删除前调用 `prepareDeleteRecovery`，不再依赖 `adjustActiveIndexAfterDelete(0)` 与子组件竞态。（`adjustActiveIndexAfterDelete` 函数仍保留，现时无调用方可后续清理。）

### 行头图标
- **文件**：`src/style/cpns/clip-item-list.less` — `.clip-status-icons` 增加 `flex-wrap: nowrap`。

## 手工验证（待执行）

### 单击上下键
- [ ] 项已在视口内完整可见时不应额外滚动
- [ ] 裁切或不可见时滚入视口

### 长按上下键
- [ ] 进入分页式跳转
- [ ] 目标居中且选中清晰
- [ ] 底部无更多数据时半页兜底、停止行为符合预期

### 删除操作
- [ ] 单选删除：选中下一项/上一项，不错位
- [ ] 多选删除：高亮连续，无闪烁
- [ ] 批量删除：高亮正确
- [ ] 搜索结果删除：高亮正确

### 样式验证
- [ ] 窄宽窗口下锁/收藏图标不换行
- [ ] 主文案可截断

## 风险与回滚点
- 删除恢复依赖 `showList` 引用变化触发 `watch`；若未来某路径原地改数组不替换引用，需补一次触发。
- 回滚面：`useVirtualListScroll.js`、`ClipItemList.vue`、`Main.vue`（搜索/收藏删除段）、`clip-item-list.less`。

## 总结
- 长按分页：单通道居中滚动；底部可增加半页滚动兜底。
- 删除：`deleteAnchor` + `prepareDeleteRecovery` 收敛父子竞态；搜索/收藏批量删除已接入。
- 图标：状态区强制不换行。
