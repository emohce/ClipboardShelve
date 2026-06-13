# EM-2026-06-13：静默快捷粘贴误用列表粘贴通路

## 症状

全局快捷键 `quick-paste-top` / `quick-paste-pin-group` 触发后，外部只出现 `v`，或面板停在事件窗；列表内粘贴正常。

## 错误思路

- 认为静默入口与列表点击/Enter 相同，继续走「写剪贴板 → 隐藏窗口 → 模拟 Ctrl+V」。
- 失败后用「加长等待、异步调度、mount 后再 hide」当作修复，本质是时序补丁而非 API 选择。
- 把组合 cache 优化当成粘贴焦点问题的解法（cache 只管条目解析，不管粘贴 API）。

## 正确思路

- `mainHide` 静默入口在窗口切换期间，修饰键往往到不了外部应用；应使用 uTools **`hideMainWindowPaste*`** 原生 API。
- 冷启动 pending + mount 后 flush 是启动顺序问题，与粘贴 API 选择无关。
- 宏步骤间 settle 只服务多步命令，不能迁移到静默单步粘贴。

## 禁止再试

- 以 `simulateKeyboardTap` + 延迟作为静默快捷粘贴的主方案。

## 详见

[quick-paste-runtime.md](../quick-paste-runtime.md)
