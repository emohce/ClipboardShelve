# Verify

## T1 补齐 move-fix 的 codex spec/plan/tasks 文档
- status: pass
- build: 未执行，文档任务无需构建
- manual-check: 已核对目录结构为 `specs/26040601-move-fix/codex/`
- docs: 已新增 `01-spec.md`、`02-plan.md`、`03-tasks.md`、`04-verify.md`
- notes: 后续实现任务完成后补充构建与手工验证结果

## T2 收敛列表单步与长按导航逻辑
- status: pass
- build: `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null && pnpm run build` -> pass
- manual-check: 未执行 `pnpm run serve` / uTools 运行时手测；建议验证单步上下键“可见则不滚”、长按上下键分页居中、到底部加载更多
- docs: 已更新 [src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue) 对应实现与本目录文档
- notes: 当前仅完成构建验证，未在真实快捷键环境确认 OS key repeat 与 uTools 热键层的最终体感

## T3 修复删除后高亮恢复与锁状态即时刷新
- status: pass
- build: 同上，构建通过
- manual-check: 未执行；建议验证删除中间项/最后一项/批量删除、`locked` 筛选下锁定与解锁即时刷新、收藏页强制删除仍仅取消收藏
- docs: 已更新 [src/views/Main.vue](../../../src/views/Main.vue) 与 [src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue) 的删除恢复逻辑说明
- notes: 删除恢复现改为 `deleteAnchor` 主导；若后续仍有错位，优先排查 `showList` 更新时机

## T4 补最小样式修正并完成验证记录
- status: pass
- build: 同上，构建通过
- manual-check: 未执行；建议验证窄宽度下锁/收藏图标与标签是否仍保持单行截断
- docs: 已更新 [src/cpns/ClipItemRow.vue](../../../src/cpns/ClipItemRow.vue) 与 [src/style/cpns/clip-item-list.less](../../../src/style/cpns/clip-item-list.less)
- notes: 未在不同系统字体与缩放比下做视觉回归
