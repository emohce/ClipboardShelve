# Plan: Vite + TanStack Virtual 列表迁移

## 1. 变更目标

将工程底座从 Vue CLI + webpack 4 迁移到 Vue 3.5 + Vite，将主列表从 vue-virtual-scroller 迁移到 TanStack Virtual，重写列表交互层以解决单步导航、长按/分页不一致、删除恢复闪烁等核心问题，同时保持 uTools 插件运行方式和宿主桥接能力不变。

## 2. 现状与根因

**构建层现状**
- 当前使用 Vue CLI 5.0.8 + webpack 4.37.0
- vue.config.js 配置了 publicPath、devServer、chainWebpack（UglifyJsPlugin）
- babel.config.js 使用 @vue/cli-plugin-babel/preset
- 开发服务器端口 8081，对应 public/plugin.json 的 development.main

**列表层现状**
- ClipItemList.vue 使用 vue-virtual-scroller 的 DynamicScroller/DynamicScrollerItem
- 导航逻辑在 ClipItemList.vue 中，通过 hotkeyRegistry 注册 feature（list-nav-up/down/page-up/page-down）
- 单步导航调用 setKeyboardActiveIndex，但"完全可见则不滚"判断在 scrollActiveNodeIntoView 中，逻辑分散
- 长按导航有独立 startKeyHoldAutoScroll 逻辑，与分页导航 getPageStep 不统一
- 删除恢复逻辑在 Main.vue 的 handleDataRemove 和 ClipItemList.vue 的 watcher 中，存在父子双写
- Main.vue 负责计算 currentShowList（L927-931），作为列表真相源

**根因分析**
- vue-virtual-scroller 的 scrollToItem API 与 DOM scrollIntoView 混用，导致行为不一致
- 导航状态、滚动策略、懒加载耦合在单一组件中，难以独立优化
- 删除恢复时 Main.vue 和 ClipItemList.vue 各自维护索引，导致状态竞争
- 虚拟滚动、预览、多选、懒加载在同一组件内，重渲染范围难以控制

## 3. 设计方案

**迁移策略**
- 分两阶段：先迁移构建（Vite），再重写列表（TanStack Virtual）
- 降低单次变更半径，每阶段独立验证
- 第一阶段完成后确保构建和基础功能回归，再进入第二阶段

**第一阶段：Vite 迁移**
- 用 Vite 替换 Vue CLI，保留现有 Vue 3.2.37 版本（后续可升级到 3.5）
- 新增 vite.config.js，配置 publicPath、devServer 端口 8081、构建优化
- 移除 vue.config.js、babel.config.js（Vite 内置 ESBuild 转译）
- 调整 package.json 脚本：serve 改为 vite，build 改为 vite build
- 保持 public/plugin.json 的 development.main 为 http://localhost:8081/
- 保持 dist/plugin.json 生成路径符合 uTools 要求

**第二阶段：TanStack Virtual 列表重写**
- 用 @tanstack/vue-virtual 替换 vue-virtual-scroller
- 拆分 ClipItemList.vue 为三层：
  - 导航状态层：管理 activeIndex、selectedItemIdSet、键盘状态
  - 滚动策略层：封装 scrollToIndex、完全可见判断、分页步长计算
  - 行渲染层：保留 ClipItemRow.vue，适配 TanStack Virtual 的 row 渲染接口
- Main.vue 继续负责 currentShowList 真相源，通过 props 传递给列表组件
- 删除恢复逻辑单一化：Main.vue 通知删除，列表组件响应 activeIndex 变化，避免双写
- 长按导航与分页导航统一：共享同一滚动策略函数，确保行为一致

**TanStack Virtual 策略设计**
- item measurement：使用 estimateSize 动态计算，初始 44px 与当前 min-item-size 一致
- scrollToIndex：使用 TanStack 的 scrollToIndex API，align 参数映射（start/center/end）
- overscan：设置为 3-5 项，平衡性能和滚动流畅度
- 完全可见判断：基于 getBoundingClientRect 实现，与当前 isNodeFullyVisible 逻辑一致

**存储方案**
- 保持现有 JSON 文件存储，不切换到 uTools DB
- initPlugin.js 的兼容迁移逻辑保持不变

**接口设计**
- Main.vue → ClipItemList.vue：
  - props: showList、currentActiveTab、isMultiple
  - emit: onDataChange、onDataRemove、loadMore
- 删除恢复流程：
  - 用户触发删除 → Main.vue.handleDataRemove → 更新 window.db → 更新 showList → ClipItemList 响应 props 变化 → activeIndex 自动调整

**状态管理**
- 导航状态（activeIndex、selectedItemIdSet）继续在 ClipItemList.vue 中管理
- 避免父子双写：Main.vue 不直接操作 activeIndex，只通过 showList 变化触发列表组件内部调整
- 使用 computed 派生 activeIndex 的合理位置（如删除后 clamp 到有效范围）

## 4. 受影响文件

**构建配置**
- package.json：修改 scripts、dependencies（移除 @vue/cli-service、webpack，新增 vite、@tanstack/vue-virtual）、devDependencies
- vue.config.js：删除（替换为 vite.config.js）
- babel.config.js：删除（Vite 内置转译）
- 新增 vite.config.js：配置 publicPath、devServer、build 选项

**列表模块**
- src/cpns/ClipItemList.vue：核心重写，拆分为导航状态层、滚动策略层、行渲染层
- src/cpns/ClipItemRow.vue：最小适配，确保与 TanStack Virtual 的 row 渲染接口兼容
- src/style/cpns/clip-item-list.less：样式微调，确保 TanStack Virtual 的容器高度和滚动行为正确

**状态编排**
- src/views/Main.vue：调整 handleDataRemove 逻辑，移除对 activeIndex 的直接操作，确保单一事实源

**快捷键体系**
- src/global/hotkeyRegistry.js：保持不变，feature 注册接口继续兼容
- src/global/hotkeyBindings.js：保持不变

**插件运行期**
- public/plugin.json：保持不变
- public/preload.js：保持不变
- public/listener.js：保持不变
- src/global/initPlugin.js：保持不变

**文档**
- specs/26040502-vite-tanstack-list/windsurf/02-plan.md：新增
- specs/26040502-vite-tanstack-list/windsurf/03-tasks.md：后续新增
- specs/26040502-vite-tanstack-list/windsurf/04-verify.md：后续新增

## 5. 数据与状态变更

**数据流**
- 保持 window.db 作为数据源，Main.vue 通过 window.db 获取数据
- Main.vue 计算 showList、currentShowList，通过 props 传递给 ClipItemList.vue
- 删除操作：Main.vue 调用 window.db 删除 → 更新 showList → ClipItemList.vue 响应 props 变化

**状态生命周期**
- activeIndex：ClipItemList.vue 内部管理，响应 showList 变化自动调整
- selectedItemIdSet：ClipItemList.vue 内部管理，响应多选操作
- 滚动状态：TanStack Virtual 内部管理，通过 scrollToIndex API 控制

**持久化**
- 不涉及持久化变更，继续使用 window.db 的 JSON 文件存储

**兼容处理**
- 历史数据兼容迁移逻辑（collect、collectData、collectTime、tags、remark、locked、originPaths）保持不变
- 收藏数据分离模型保持不变

## 6. 接口与交互变更

**输入变化**
- 用户可见的键盘快捷键保持不变（上下键、PageUp/PageDown、空格、Enter 等）
- 鼠标交互保持不变（点击、hover、多选）

**输出变化**
- 单步导航：完全可见项不触发滚动（统一判断逻辑）
- 长按导航：与分页导航行为一致（共享滚动策略）
- 删除恢复：高亮稳定，无闪烁、无错位（单一事实源）
- 状态刷新：行头状态立即更新，不触发整个列表重渲染

**错误路径**
- 滚动失败：降级到 DOM scrollIntoView（与当前逻辑一致）
- 数据加载失败：保持现有错误处理逻辑
- 快捷键冲突：保持 hotkeyRegistry 的优先级和阻断逻辑

**用户可见变化**
- 交互响应速度提升（300ms 内达到稳定）
- 滚动行为更一致（单步、长按、分页统一）
- 高亮更稳定（删除后不错位）

## 7. 实施步骤

**阶段 1：Vite 迁移**
1. 安装 Vite 和相关依赖：`pnpm add -D vite @vitejs/plugin-vue`
2. 创建 vite.config.js，配置 publicPath、devServer、build 选项
3. 修改 package.json 脚本：serve 改为 vite，build 改为 vite build
4. 移除 vue.config.js、babel.config.js
5. 调整 package.json 依赖：移除 @vue/cli-service、webpack、uglifyjs-webpack-plugin、vue-template-compiler、less-loader
6. 调整 package.json 依赖：保留 less（Vite 内置支持）
7. 验证构建：`pnpm run build` 确认 dist/plugin.json 正确生成
8. 验证开发服务器：`pnpm run serve` 确认 http://localhost:8081/ 可访问
9. 验证 uTools 插件加载：在 uTools 环境中确认插件能正常启动

**阶段 2：TanStack Virtual 列表重写**
1. 安装 @tanstack/vue-virtual：`pnpm add @tanstack/vue-virtual`
2. 移除 vue-virtual-scroller 依赖：`pnpm remove vue-virtual-scroller`
3. 在 ClipItemList.vue 中拆分导航状态层：提取 activeIndex、selectedItemIdSet、键盘状态管理逻辑
4. 在 ClipItemList.vue 中拆分滚动策略层：封装 scrollToIndex、完全可见判断、分页步长计算
5. 用 TanStack Virtual 的 useVirtualizer 替换 DynamicScroller
6. 适配行渲染：保留 ClipItemRow.vue，调整以配合 TanStack Virtual 的 row 渲染接口
7. 统一长按导航与分页导航：共享同一滚动策略函数
8. 单一化删除恢复逻辑：Main.vue 只负责数据更新，ClipItemList.vue 响应 props 变化调整 activeIndex
9. 调整样式：确保 TanStack Virtual 的容器高度和滚动行为正确
10. 验证交互：单步导航、长按导航、分页导航、删除恢复、状态刷新
11. 验证功能回归：主列表浏览、搜索、筛选、收藏、删除、锁定、复制、粘贴
12. 验证快捷键体系：hotkeyRegistry 继续工作，所有 feature 正常触发

## 8. 测试与验证方案

**阶段 1 验证**
- 构建验证：`pnpm run build` 确认成功生成 dist/plugin.json
- 开发服务器验证：`pnpm run serve` 确认 http://localhost:8081/ 可访问
- uTools 插件验证：在 uTools 环境中确认插件能正常加载和运行
- 功能回归验证：主列表浏览、搜索、筛选、收藏、删除、锁定、复制、粘贴核心能力正常
- 快捷键验证：键盘单步导航、分页导航、多选操作正常

**阶段 2 验证**
- 交互性能验证：单次交互（导航、删除、状态切换）后，UI 在 300ms 内达到滚动稳定且高亮正确
- 单步导航验证：完全可见项不触发滚动
- 长按导航验证：与分页导航行为一致
- 删除恢复验证：高亮稳定，无闪烁、无错位
- 状态刷新验证：行头状态立即更新，不触发整个列表重渲染
- 混排搜索验证：currentShowList 重新计算，高亮索引保持合理位置
- 兼容性验证：uTools 插件环境能正常加载和运行，window.exports、window.db、window.listener 等全局能力可用
- 收藏数据验证：收藏数据分离模型继续正确工作
- 历史数据验证：兼容迁移逻辑继续有效

**验证命令**
- 构建验证：`pnpm run build`
- 开发验证：`pnpm run serve`
- 插件环境验证：在 uTools 中手动测试

## 9. 风险与回滚点

**阶段 1 风险**
- 风险：Vite 配置不当导致静态资源路径错误
  - 缓解：保持 publicPath 为 './'，与当前 vue.config.js 一致
  - 回滚：恢复 vue.config.js、babel.config.js，回退 package.json 脚本和依赖
- 风险：开发服务器端口冲突
  - 缓解：明确配置 devServer.port 为 8081
  - 回滚：调整端口或回退到 Vue CLI
- 风险：uTools 插件加载失败
  - 缓解：确认 dist/plugin.json 路径正确，不改变 public/plugin.json
  - 回滚：恢复 Vue CLI 构建，重新打包

**阶段 2 风险**
- 风险：TanStack Virtual 行为与 vue-virtual-scroller 不一致
  - 缓解：充分测试 scrollToIndex、overscan、item measurement 策略
  - 回滚：恢复 vue-virtual-scroller，回退 ClipItemList.vue
- 风险：删除恢复逻辑引入新问题
  - 缓解：单一事实源设计，避免父子双写
  - 回滚：恢复 Main.vue 和 ClipItemList.vue 的旧逻辑
- 风险：快捷键体系失效
  - 缓解：保持 feature 注册接口不变，只调整内部实现
  - 回滚：恢复 ClipItemList.vue 的 feature 注册逻辑
- 风险：样式错位或溢出
  - 缓解：逐项测试桌面窗口尺寸下的布局
  - 回滚：恢复 src/style/cpns/clip-item-list.less

**回滚策略**
- 每个阶段完成后打 git tag，便于快速回滚
- 阶段 1 回滚：恢复 vue.config.js、babel.config.js、package.json，删除 vite.config.js
- 阶段 2 回滚：恢复 ClipItemList.vue、ClipItemRow.vue、clip-item-list.less，恢复 vue-virtual-scroller 依赖

## 10. 待确认项

- 阶段 1 完成后是否需要立即升级 Vue 到 3.5，还是保持 3.2.37 先验证构建迁移？
- TanStack Virtual 的 overscan 数值是否需要根据实际列表长度动态调整？
- 阶段 2 实施时是否需要先在独立分支并行开发，还是直接在主分支逐步替换？
- 是否需要为 TanStack Virtual 封装独立的 hook（useListNavigation、useListScrollStrategy），还是在 ClipItemList.vue 内部实现？
