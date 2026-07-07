# Tab Scoped Pin Group Raw Requirement

Tool: codex

## User Wording

用户指出：普通多选 item 分组后，会在不同 type 中共同展示。例如在“全部”里分组后，会在“收藏”、“图片”和“文字”中都展示，但这没有必要。

用户期望：

- 分组要按具体 Type / Tab 区分，例如“收藏”、“全部”、“图片”各自有自己的分组。
- 全局触发 `quick-paste-pin-group` 时，使用离开前最后一次所在 Tab 对应的分组。
- 只需要记忆最后退出的 Tab。
- 全局缓存要缓存每个 Type 对应的类型、该 Type 下的分组操作和具体数据。
- 本次需要完成原始需求梳理，并同步修改相关文档。

## Initial Interpretation

当前 `pin.group` 是单一全局组合，导致合成置顶组合项被所有主 Tab 复用。新行为应把组合状态拆成按顶层 Tab type 分桶的结构：`collect`、`all`、`text`、`image`、`file`。收藏子 Tab 仍属于 `collect` 的过滤上下文，不单独产生组合桶。
