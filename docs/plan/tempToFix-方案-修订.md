# tempToFix 方案修订（基于用户 3 点澄清）

## 默认值原则

**默认选项直接写在初始代码内，无需用户手动配置。**  
所有默认值（如保存时间不限制、operation.custom 不含统计/百度/翻译等）由源码中的默认配置（如 setting.json、restoreSetting）决定；新安装或重置后即为此状态，用户无需在设置页或配置中再做选择。

---

## 修订点摘要

1. **统计 / 百度搜索 / 翻译**：不从配置中“隐藏”，而是**直接清理**——从默认配置与运行时配置中移除这三项，不在配置内体现。
2. **左右键**：指**键盘方向键**。左方向键 = 返回普通层/关闭抽屉；右方向键 = 打开抽屉。**鼠标右键**可加入，作用与右方向键一致（打开抽屉）。
3. **Esc**：与左方向键一致，也触发**返回普通层/关闭抽屉**的效果（抽屉层已绑定 Escape → drawer-close，方案中明确写出）。

---

## 1. 数据持久化：保存时间「不限制」

- **初始代码**：在 [setting.json](src/data/setting.json) 与 [restoreSetting.js](src/global/restoreSetting.js) 中，默认 `database.maxage` 设为 `null`（不限制），无需用户手动配置。
- Setting.vue：最长保存时间下拉增加「不限制」选项，值为 `null`（供用户可选；默认从上述配置读取）。
- initPlugin.js：`maxage == null` 时不按时间删除。

---

## 2. 查看菜单：直接清理统计、百度搜索、翻译

**原则**：默认直接写在初始代码内，无需用户手动配置。

- **初始代码**：[setting.json](src/data/setting.json) 的 `operation.custom` 中**不再包含**以下三项（从源码中删除）：
  - 百度搜索（`redirect:百度一下`）
  - 统计文本字数（`redirect:统计文本次数`）
  - 翻译（`redirect:翻译`）
- **已有用户**：在 [readSetting.js](src/global/readSetting.js)（或首次加载设置时）做一次迁移：从已存储的 `operation.custom` 中移除上述三项，再写回存储，使配置内不再体现。
- **结果**：新安装/重置后默认即无这三项；主界面与抽屉自然不展示，无需用户做任何配置。

---

## 3. 普通层 / 抽屉层：左右键与 Esc（修订）

### 3.1 左右键 = 键盘方向键

- **左方向键（Arrow Left）**  
  - 在**抽屉层**：触发返回普通层/关闭抽屉（已绑定 `drawer-close`，保持不变）。
- **右方向键（Arrow Right）**  
  - 在**普通层（main）**：对当前高亮 item 打开抽屉，效果与下面“鼠标右键”一致。  
  - 实现：在 main 层为 `ArrowRight` 绑定新 feature（如 `list-drawer-open`），逻辑为：若有当前 item，则打开抽屉（设置 drawerItems/position/defaultActive，drawerShow = true，激活 clip-drawer 层）。

### 3.2 鼠标右键（与右方向键一致）

- 在**普通层**，对当前点击的 item：**鼠标右键**打开抽屉（与右方向键行为一致）。
- 实现：在 ClipItemList `handleItemClick` 中，`button === 2` 时不再“仅复制”，改为：设置 activeIndex、计算 position、设置子菜单列表、`drawerShow = true`，并 `ev.preventDefault()` 阻止系统右键菜单。

### 3.3 Esc 触发与左方向键相同的返回效果

- 在**抽屉层**：**Esc** 与 **左方向键** 均触发返回普通层/关闭抽屉。
- 当前 [hotkeyBindings.js](src/global/hotkeyBindings.js) 已配置：
  - `clip-drawer` + `Escape` → `drawer-close`
  - `clip-drawer` + `ArrowLeft` → `drawer-close`
- 无需改代码，仅在方案中**明确**：Esc 与左方向键效果一致，均为关闭抽屉并返回普通层。

---

## 4. 其余方案要点（与之前一致）

- **抽屉层**：上下键切换子菜单选中，Enter / Ctrl+Enter 触发高亮子菜单；`*` 阻止穿透；子菜单列表排除收藏/移出收藏/删除，并与“查看菜单”一致（清理后自然无统计/百度/翻译）。
- **普通层**：Ctrl+Shift+序号 触发子菜单抽屉层对应功能，与抽屉内序号一致（共用 `getDrawerSubmenuItems`）。
- **子菜单**：`getDrawerSubmenuItems(currentItem)` 排除 `collect`、`un-collect`、`remove`，再 `applyDrawerOrder`；右键/右方向键打开抽屉与 list-drawer-sub-n 均使用该列表。

---

## 5. 实现顺序建议（含修订）

1. 数据持久化：保存时间不限制（Setting.vue / setting.json / initPlugin.js）。
2. **直接清理**统计、百度、翻译：从 setting.json 默认 custom 中删除三项；在 readSetting（或加载逻辑）中迁移已有用户的 operation.custom，移除这三项。
3. 子菜单列表与 list-drawer-sub-n 共用 `getDrawerSubmenuItems`。
4. **右方向键**：main 层绑定 ArrowRight → `list-drawer-open`，打开当前 item 的抽屉。
5. **鼠标右键**：handleItemClick 中 button===2 时打开抽屉（与右方向键一致）。
6. 抽屉层：确认 Esc 与 ArrowLeft 均为 drawer-close；增加 clip-drawer 的 Ctrl+Enter → drawer-select。
