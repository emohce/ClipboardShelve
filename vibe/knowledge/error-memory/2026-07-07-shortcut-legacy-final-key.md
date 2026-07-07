# Error Memory: EM-2026-07-07-shortcut-legacy-final-key

Tool: codex

## 症状

为拒绝 `Ctrl+Shift` / `Ctrl+Shift+` 这类无主键输入时，误把 legacy `Ctrl+S`、`Ctrl+A`、`Ctrl+Shift+S` 中最后的 `s` / `a` 当成修饰符别名，导致旧格式输入或迁移结果变成无效快捷键。

## 错误思路

- 把 legacy `+` 分隔格式的每一段都按“可选修饰符”解析。
- 认为 `s` / `a` / `c` 只要命中修饰符短名，就不可能是最后的字符主键。
- 用“没有主键则无效”修复不完整前缀时，没有同时回归旧格式单字母主键。

## 正确思路

- legacy `+` 分隔格式中，最后一段是主键；前面的段落才是修饰符。
- `Ctrl+S` -> `c-s`，`Ctrl+Shift+S` -> `c-s-s`，`Ctrl+Alt+A` -> `c-a-a`。
- `Ctrl+Shift`、`Ctrl+Alt` 这类以完整修饰符名称结束且没有主键的输入才应无效。
- 权威语义见 [../../specs/260613-SettingUiModify/260614-shortcut-compact-semantics.md](../../specs/260613-SettingUiModify/260614-shortcut-compact-semantics.md)。

## 禁止再试

- 不要把 legacy `+` 输入的最后一段和前置修饰段用同一套“命中修饰符就吞掉”的规则处理。
- 不要只测 `Ctrl+Shift+Delete`；必须同时测 `Ctrl+S`、`Ctrl+Shift+S`、`Alt+A`、`Ctrl+Alt+A` 和无主键反例。
