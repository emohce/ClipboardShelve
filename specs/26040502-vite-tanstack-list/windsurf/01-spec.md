# Feature: Vite + TanStack Virtual 列表迁移

## 1. 目标

- 将工程底座从 Vue CLI + webpack 4 迁移到 Vue 3.5 + Vite
- 将主列表方案从 vue-virtual-scroller 迁移到 TanStack Virtual
- 重写主列表交互层：导航状态层、滚动策略层、行渲染层
- 保持 uTools 插件运行方式和宿主桥接能力不变

## 2. 背景

当前主列表交互层存在以下核心问题：

- 单步滚动与"完全可见则不滚"逻辑不一致
- 长按导航与分页导航存在多套独立逻辑，行为不统一
- 删除恢复逻辑存在父子双写，导致高亮错位和闪烁
- 虚拟滚动、预览、多选、懒加载耦合过深，难以独立优化
- 行头状态刷新与布局压缩依赖主列表刷新时机，导致响应延迟

根因分析表明，问题主要在列表交互层，而非单纯框架老化。只升级构建器不重写列表内核收益有限。TanStack Virtual 更适合高定制键盘交互和 headless 控制，Vite 能降低后续维护成本。

## 3. 用户场景 / 使用场景

**场景 1：单步导航**
- 用户在主列表中按上下键单步导航
- 当目标项完全可见时，不触发滚动
- 当目标项部分可见或不可见时，滚动使其完全可见
- 高亮状态立即更新到目标项

**场景 2：长按导航**
- 用户长按上下键时，按照半分页或分页步长连续滚动
- 滚动行为与分页导航保持一致
- 高亮状态随滚动实时更新
- 松开按键后，高亮稳定在最终可见项

**场景 3：分页导航**
- 用户按 PageUp/PageDown 时，按照固定步长滚动
- 滚动步长与长按导航保持一致
- 高亮状态更新到滚动后的可见项

**场景 4：删除恢复**
- 用户删除当前高亮项后，高亮自动恢复到相邻项
- 恢复逻辑不闪烁、不错位
- 收藏数据和普通历史数据的删除行为一致
- 删除后列表重新计算 currentShowList

**场景 5：锁/收藏状态刷新**
- 用户对某项进行收藏/取消收藏操作
- 行头收藏图标立即更新
- 状态变化不触发整个列表重渲染
- 收藏块和普通历史块的混排逻辑保持正确

**场景 6：混排搜索与筛选**
- 用户在搜索框输入关键词
- 列表实时过滤，currentShowList 重新计算
- 高亮索引在过滤后保持合理位置
- 锁筛选、收藏块筛选继续可用

## 4. 非目标

- 不改变 uTools 插件形态和入口方式
- 不改变数据库业务语义和存储模型（JSON 文件或 uTools DB）
- 不改变收藏独立存储模型（collectData 与 data 分离）
- 不改变主业务能力和主要快捷键语义
- 不改变 Main.vue 作为页面级状态编排中心的角色
- 不修改 public/preload.js、public/listener.js 的宿主桥接逻辑

## 5. 验收标准

**构建验收**
- `pnpm run build` 成功生成 dist/plugin.json
- `pnpm run serve` 能正常启动开发服务器
- 无 webpack 迁移导致的静态资源路径错误

**交互性能验收**
- 单次交互（导航、删除、状态切换）后，UI 在 300ms 内达到滚动稳定且高亮正确
- 单步导航时，完全可见项不触发滚动
- 长按导航与分页导航行为一致
- 删除后高亮稳定，无闪烁、无错位

**功能回归验收**
- 主列表浏览、搜索、筛选功能正常
- 收藏、删除、锁定、复制、粘贴核心能力正常
- 键盘单步导航、分页导航、多选操作正常
- 抽屉、详情、标签编辑、清理弹窗等层级切换正常
- 快捷键体系继续工作（hotkeyRegistry、hotkeyBindings）

**兼容性验收**
- uTools 插件环境能正常加载和运行
- window.exports、window.db、window.listener 等全局能力可用
- 收藏数据分离模型继续正确工作
- 历史数据兼容迁移逻辑（initPlugin.js）继续有效

## 6. 边界与异常

**uTools 插件环境**
- 必须继续兼容 uTools 主窗口静态入口
- 必须继续兼容 preload.js 注入的全局能力
- 不能把项目误当成纯浏览器 SPA 去重构

**数据模型兼容**
- 收藏不是简单 collect 标记，而是普通历史和收藏数据分离存储
- 收藏逻辑涉及从普通历史迁出/迁回，不能破坏现有语义
- 历史数据兼容迁移逻辑（collect、collectData、collectTime、tags、remark、locked、originPaths）不能删除

**快捷键体系**
- hotkeyRegistry 按 layer + state + shortcut 绑定 feature
- 列表重写后，feature 注册接口必须保持兼容
- Mac 上 ctrl/meta 映射兼容逻辑不能丢失

**构建产物**
- dist/plugin.json 必须符合 uTools 打包要求
- 不能因 Vite 迁移导致静态资源路径错误
- listener.js、preload.js 等关键文件必须正确打包

**并发与异步**
- 删除恢复逻辑要避免父子双写导致的状态竞争
- 滚动策略要避免多次快速滚动导致的中间状态不一致
- 状态刷新要避免频繁重渲染导致的性能问题

## 7. 影响范围

**构建配置**
- package.json：依赖声明（vue、vite、@tanstack/vue-virtual）、构建脚本
- vue.config.js：可能废弃或替换为 vite.config.js
- babel.config.js：可能需要调整以适配 Vite

**列表模块**
- src/cpns/ClipItemList.vue：核心重写，从 vue-virtual-scroller 迁移到 TanStack Virtual
- src/cpns/ClipItemRow.vue：行渲染层适配，可能需要调整以配合新虚拟列表
- src/style/cpns/clip-item-list.less：样式适配，确保 TanStack Virtual 的布局正确

**状态编排**
- src/views/Main.vue：继续负责 currentShowList 真相源和页面级状态编排，可能需要调整与列表组件的交互接口
- src/hooks/：可能需要新增导航状态 hook、滚动策略 hook

**快捷键体系**
- src/global/hotkeyRegistry.js：可能需要调整以适配新的列表交互接口
- src/global/hotkeyBindings.js：保持现有绑定表不变

**插件运行期**
- public/plugin.json：保持不变
- public/preload.js：保持不变
- public/listener.js：保持不变
- src/global/initPlugin.js：保持不变，确保数据兼容迁移逻辑继续有效

**文档**
- specs/26040502-vite-tanstack-list/windsurf/：新增 spec、plan、tasks、verify 文档

## 8. 待确认项

- 是否先迁移构建（Vite），再重写列表（TanStack Virtual），还是并行推进？
- TanStack Virtual 的 item measurement、scrollToIndex、overscan 策略应该如何设计？
- 是否需要同时切换到 uTools DB，还是保持现有 JSON 文件存储？
- Main.vue 与新列表组件之间的交互接口应该如何设计，以避免父子双写？
- 导航状态是否需要提到独立 hook，还是继续在 ClipItemList.vue 中管理？
