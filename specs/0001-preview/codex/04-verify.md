# Verify

## T1 收敛图片预览底部提示与预览层样式
- status: partial
- build: 未执行成功；当前环境缺少 `node` / `pnpm`，`npm run build` 直接报 `command not found: npm`
- manual-check: 未执行；当前会话无法启动前端构建/运行环境
- docs: 已更新 [`specs/0001-preview/codex/03-tasks.md`](./03-tasks.md) 与本文件
- notes: 已完成静态代码复查；图片预览改为“优先完整放进视区”，仅在实际可滚动时显示对应方向的 Shift 操作提示

## T2 为可预览文字增加列表轻量区分与预览层强化
- status: partial
- build: 未执行成功；同上
- manual-check: 未执行；待在 `npm run serve` 或插件环境中验证“长文”轻量标签、单行 90% 宽度、省略展示
- docs: 已记录
- notes: 文字可预览范围仍沿用当前长文本判定，没有扩展到普通短文本

## T3 锁定 Shift 预览期间的鼠标移入切换行为并保持滚动快捷键一致
- status: partial
- build: 未执行成功；同上
- manual-check: 未执行；待验证 Shift 长按预览显示后，鼠标移入其他条目不切换，`Shift + ↑/↓/←/→` 滚动符合预期
- docs: 已记录
- notes: `shift+ArrowLeft` / `shift+ArrowRight` 绑定在当前代码中已存在，本次实现复用现有统一滚动入口

## T4 记录验证结果与未验证项
- status: pass
- build: 已真实记录未执行原因
- manual-check: 已真实记录未执行原因
- docs: pass
- notes: 后续补验应优先执行 `pnpm build` 或在装好 Node 后执行仓库约定的构建命令
