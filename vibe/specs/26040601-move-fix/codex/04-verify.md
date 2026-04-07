# Verify

## T1 收敛 `ClipItemList` 的上下键导航入口
- status: pass
- build: `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null && pnpm run build` -> pass
- manual-check: 未执行；代码层已移除普通 `ArrowUp/ArrowDown` 在捕获阶段的第二导航入口，保留 hotkey feature 作为唯一单步导航入口
- docs: 已更新 [03-tasks.md](./03-tasks.md)
- notes: 长按分页入口已在 T2 补回，本任务不再残留第二套普通上下键推进

## T2 统一单步移动、长按分页与边界 `loadMore` 的滚动策略
- status: pass
- build: 同上，构建通过
- manual-check: 未执行；代码层已让长按通过捕获阶段只负责启动/停止定时器，分页移动统一复用 `scrollByPage` 结果，并继续兼容边界 `loadMore`
- docs: 已更新 [03-tasks.md](./03-tasks.md)
- notes: 仍需在实际运行时确认长按触发延迟、分页步长体感以及到底部后的连续加载体验

## T3 将删除后的高亮恢复职责统一到父层展示列表回流
- status: pass
- build: 同上，构建通过
- manual-check: 未执行；代码层已移除子组件基于 `deleteAnchor` 的删除恢复，统一由 [src/views/Main.vue](../../../src/views/Main.vue) 在刷新后恢复高亮
- docs: 已更新 [03-tasks.md](./03-tasks.md)
- notes: 普通删除、批量删除、搜索删除的落点规则仍需手工确认是否完全符合“下一条优先，否则最后一条”

## T4 修正锁定/收藏状态的即时刷新与单行头部渲染
- status: pass
- build: 同上，构建通过
- manual-check: 未执行；批量锁定已改为直接 `queuePersistDb()`，当前单行头部沿用 `clip-status-icons` + 单行压缩样式
- docs: 已更新 [03-tasks.md](./03-tasks.md)
- notes: 还需在窄窗口和高标签密度场景下确认图标、时间、标签的视觉表现

## T5 执行构建验证并补充最小手工回归记录
- status: partial
- build: `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 24 >/dev/null && pnpm run build` -> pass
- manual-check: 未执行 `pnpm run serve` 与 uTools 插件环境手测；建议最少回归单步上下键、长按分页、删除中间项/最后一项/搜索删除、`locked` 筛选下锁定解锁、窄宽度图标排布
- docs: 已补齐本文件任务级验证记录
- notes: 当前验证只覆盖构建成功；大包体 warning 仍存在，但不是本次改动引入的新错误
