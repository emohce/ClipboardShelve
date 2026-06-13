# 快捷键多键绑定与改键弹窗重构

**基线**：2026-06-13  
**范围**：[`src/global/shortcutReservations.js`](../../../src/global/shortcutReservations.js)、[`src/global/shortcutStore.js`](../../../src/global/shortcutStore.js)、[`src/global/shortcutCommandRows.js`](../../../src/global/shortcutCommandRows.js)、[`src/global/keybindingConflicts.js`](../../../src/global/keybindingConflicts.js)、[`src/storage/shortcutKeybindingRepository.js`](../../../src/storage/shortcutKeybindingRepository.js)、[`src/views/Setting.vue`](../../../src/views/Setting.vue)、[`src/style/index.less`](../../../src/style/index.less)  
**状态**：已实现（2026-06-13）  
**权威关系**：本 spec 顶替 [`260613-zz-raw-settingUiModify.md`](260613-zz-raw-settingUiModify.md) 中 **§17 / §21 / §23** 改键弹窗交互描述；与 [`260610-shortcuts-redesign/12YG2-zz-summary-快捷键重构全景文档.md`](../260610-shortcuts-redesign/12YG2-zz-summary-快捷键重构全景文档.md) 数据模型章节联动更新。

## 目标摘要

1. **保留规则场景化**：按 commandId + when 限制不可绑定键，表格展示；非冲突场景允许同键。
2. **command 级多键**：一行一 command，`shortcutIds[]` 并存、均可触发。
3. **禁用语义**：`enabled: false` 仅阻断 action 触发，键位保留展示。
4. **改键弹窗简化**：底部单行录制 + 中部双区绑定列表 + 顶栏 command 行内默认值/恢复默认；冲突录入硬阻断；仅顶栏保存落盘。

---

## 一、改键弹窗布局（顶替旧双栏录制 UI）

### 1.1 结构示意

```
┌─ 固定按键规则表（popover，顶栏） ─────────────────────────────┐
├─ Command 行 ─────────────────────────────────────────────────┤
│  设置页向上滚动  setting.scroll.up    默认: ArrowUp  [恢复默认] │
├─ 中部双区 ───────────────────────────────────────────────────┤
│  当前绑定（左）              │  待绑定（右）                  │
│  [Delete]  ❌                │  [ctrl+d]  ❌                 │
│  [Backspace] ❌              │                               │
├─ 底部录制行 ─────────────────────────────────────────────────┤
│  按下快捷键…          [最新收录: ctrl+shift+d] ✅              │
├─ Footer ─────────────────────────────────────────────────────┤
│                                    [取消]  [确定]             │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 区域职责

| 区域 | 职责 |
|------|------|
| **Command 行** | 左：command 中文名 + `commandId`；右：**默认值**只读 chip + **恢复默认**按钮 |
| **中部左「当前绑定」** | 本轮已确认生效的快捷键列表；每行右侧悬浮 **❌** 移除 |
| **中部右「待绑定」** | 本轮新收录、待并入当前绑定的键；每行右侧悬浮 **❌** 移除 |
| **底部录制行** | 唯一录制入口（去掉中部右侧 capture 面板与独立 manual input）；聚焦此行监听 keydown |
| **底部收录区** | 每轮合法收录后，在录制行**右侧**展示最新键 + 浮动 **✅**；点 ✅ 将键**上行**至中部右「待绑定」 |

### 1.3 交互流程

1. 打开弹窗：左区 = 当前 effective `shortcutIds`；右区 = 空；底部等待输入。
2. 按下合法键 → 底部右侧出现该键 + ✅；若冲突/保留规则/重复 → **toast 拒绝，不进入收录区**。
3. 点 ✅ → 键从中部右「待绑定」追加（去重）；底部收录区清空，继续录制下一键。
4. 点 **确定** → 合并 `当前绑定 ∪ 待绑定` 为 draft → 写入 Setting 页 `hotkeyOverrides` 工作副本 → toast「已更新，点击顶栏保存后生效」→ 关弹窗。
5. **恢复默认**（Command 行右侧）：清除左/右区全部非默认键，左区恢复为 `defaultShortcutIds`，右区清空。
6. **Esc / 取消 / 关闭**：若弹窗 dirty → `保存 / 不保存 / 取消关闭`；不保存则丢弃弹窗内全部变更。

### 1.4 与旧 UI 的差异（明确顶替）

| 旧（§17/21/23） | 新 |
|-----------------|-----|
| 中部左「当前绑定」单值 + 内嵌默认值 chip/重置 | 默认值/恢复默认移至 **Command 行右侧**；左区仅多行绑定 |
| 中部右「按下新快捷键」capture 面板 | **删除**；录制仅在底部一行 |
| 底部 manual `el-input` | **删除**（可选保留为高级折叠，默认不展示） |
| 录制成功直接追加到左区 | 先到底部收录区 → ✅ → 右区「待绑定」→ 确定时合并 |
| 冲突时「仍然保存」确认框 | **录入时硬阻断**，不允许添加 |

### 1.5 状态字段（Setting.vue）

- `shortcutRecordActiveIds` — 中部左，当前绑定
- `shortcutRecordPendingIds` — 中部右，待绑定
- `shortcutRecordCapturedId` — 底部收录区待 ✅ 的键
- `shortcutRecordBaselineIds` — 打开弹窗时快照，供 dirty 检测
- `shortcutRecordDefaultIds` — 默认键集合

---

## 二、保留规则（场景化）

- 新建 [`shortcutReservations.js`](../../../src/global/shortcutReservations.js)：`{ shortcutId, commandId, when, description }`
- 校验：`isShortcutAssignable(shortcutId, { commandId, when })`
- 提示：popover **表格**（快捷键 / Command ID / When / 说明）
- 录入时与冲突检测一并执行，**不通过则不可 ✅**

---

## 三、command 级多键与禁用

### 3.1 Override 形态

```js
hotkeyOverrides['cmd:list.item.delete'] = {
  shortcutIds: ['Delete', 'Backspace', 'ctrl+d'],
  when: 'mainFocus && !inputFocus',
  enabled: true   // false = 禁用 action 触发，键仍展示
}
```

### 3.2 禁用

- 列表操作 **禁** / **启**：整 command，`enabled: false` 不 dispatch
- 键仍 muted 展示；仍占冲突检测

### 3.3 命令列表

- 一行一 `commandId`；快捷键列 `Delete / Backspace / …`

---

## 四、冲突策略

- 录入/点 ✅ 时同步检测：保留规则 + `getShortcutCommandRowConflicts`（含待绑定、当前绑定、其它 command）
- **硬阻断**：toast 说明冲突 command / when，**不提供「仍然添加」**
- 同 command 多键、when 互斥不算冲突
- 已禁用 action 的键仍作为占用方

---

## 五、持久化层级

| 层级 | 行为 |
|------|------|
| 弹窗内 | 左/右区、底部收录均为会话 state |
| 点确定 | 写入 Setting `hotkeyOverrides` 工作副本 |
| 顶栏保存 | `saveShortcutSettingsPayload` → SQLite + setting fallback |
| Esc/取消 dirty | 弹窗级保存/丢弃；不污染工作副本（选不保存时） |

---

## 六、非目标

- 组合命令 macro 多键 UI
- 主界面 `Main.vue` 布局
- 移除 Setting `keyDownHandler` 硬编码（另开任务）

---

## 七、验证清单

- [x] 改键弹窗：仅底部一行录制；✅ 上行至待绑定；确定合并；Command 行恢复默认
- [x] 中部左/右均可 ❌ 移除；恢复默认清除全部非默认键
- [x] 冲突键录入 toast 拒绝，不出现确认框
- [x] Esc/取消 dirty 三选一；顶栏保存前重启不生效
- [x] command 多键并存均可触发；列表一行多键展示
- [x] 禁用 action：键展示、不 dispatch；启后恢复
- [x] 保留规则表格 popover；场景化限制生效
- [x] 旧 override 迁移；SQLite 往返

## 八、进度

| 项 | 状态 |
|----|------|
| 需求与弹窗 UX spec（本文） | 已完成 |
| shortcutReservations + 表格提示 | 已完成 |
| cmd 级 shortcutIds + enabled | 已完成 |
| SQLite schema 迁移 | 已完成 |
| 改键弹窗 UI 重构 | 已完成 |
| 冲突硬阻断 | 已完成 |
| 测试与全景文档同步 | 已完成 |

## 九、验证记录

- **2026-06-13**：`node test-shortcut-command-system.js` 通过（cmd override 迁移、多键展开、冲突硬阻断、保留规则、SQLite shortcut_ids 往返）。
- **未做**：uTools 生产壳首次启动迁移与重启后 override 生效（见 PROJECT_STATUS 后续项）。

## Knowledge Context

- **required**：本 spec、[260613-zz-raw-settingUiModify.md](260613-zz-raw-settingUiModify.md)（布局基线，改键章节以本 spec 为准）
- **related**：[12YG2-zz-summary-快捷键重构全景文档.md](../260610-shortcuts-redesign/12YG2-zz-summary-快捷键重构全景文档.md)、[../../knowledge/error-memory/2026-06-13-setting-dialog-teleport-global-less.md](../../knowledge/error-memory/2026-06-13-setting-dialog-teleport-global-less.md)
- **memory routing**：project memory（本 spec + MEMORY_INDEX 多键行）、error-memory（teleport 全局样式）
