# Plan Status Check: 26040502-vite-tanstack-list

## Current Implementation Status

### ✅ Completed Tasks

#### T1: 建立 Vite 构建基线并替换现有 serve/build 脚本
- **Status**: ✅ COMPLETED
- **Evidence**: 
  - `package.json` 已更新为 Vite 脚本 (`serve: "vite"`, `build: "vite build"`)
  - `vite.config.js` 已创建，包含 uTools 插件资源复制逻辑
  - 依赖已更新：`@tanstack/vue-virtual`, `@vitejs/plugin-vue`, `vite`
  - 开发服务器端口配置为 8081，与 `plugin.json` 一致

#### T4: 引入 TanStack Virtual 并搭建新的列表虚拟容器
- **Status**: ✅ COMPLETED  
- **Evidence**:
  - `ClipItemList.vue` 已导入 `@tanstack/vue-virtual`
  - 模板已重构为 TanStack Virtual 结构 (`virtualRows`, `totalSize`, `transform`)
  - 行组件使用 `v-memo` 优化渲染性能

### ⚠️ Partially Completed Tasks

#### T2: 对齐 plugin.json、preload.js、listener.js 与构建产物路径契约
- **Status**: ⚠️ PARTIAL
- **Completed**: 
  - `plugin.json` 开发入口已配置为 `http://localhost:8081/`
  - Vite 配置已包含 uTools 资源复制逻辑
- **Remaining Issues**:
  - `public/index.html` 仍使用 webpack 模板变量 `<%= htmlWebpackPlugin.options.title %>`
  - 需要验证 `preload.js` 和 `listener.js` 在新构建模式下的加载

#### T3: 回归阶段 A 的基础页面与插件入口可用性
- **Status**: ⚠️ PARTIAL
- **Completed**: 
  - `pnpm run build` 可执行
  - `pnpm run serve` 可启动
- **Remaining Issues**:
  - 需要验证浏览器打开页面
  - 需要验证 uTools 插件环境加载
  - `04-verify.md` 尚未创建

### ❌ Not Started Tasks

#### T5: 抽离导航状态与滚动策略
- **Status**: ❌ NOT STARTED
- **Required**: 
  - 创建 `src/hooks/useListNavigation.js`
  - 统一单步导航、半分页/分页、底部加载待落点、完全可见判断
  - 移除多套并行 `scrollTo` 逻辑

#### T6: 收敛删除恢复与懒加载协作到父子单一契约
- **Status**: ❌ NOT STARTED
- **Required**:
  - `Main.vue` 与 `ClipItemList.vue` 删除 anchor、高亮恢复、懒加载推进职责清晰化
  - 消除父子双写索引问题

#### T7: 适配行渲染与列表样式，确保锁/收藏即时刷新和布局稳定
- **Status**: ❌ NOT STARTED
- **Required**:
  - `ClipItemRow.vue` 与 `clip-item-list.less` 在新虚拟容器下适配
  - 保证紧凑布局、图片行展示和行头图标刷新正确

#### T8: 回归热键主路径与列表核心交互
- **Status**: ❌ NOT STARTED
- **Required**:
  - `hotkeyRegistry` / `hotkeyBindings` 在新列表内核下验证
  - 覆盖单步、分页、多选、删除、强删、收藏、锁定等主路径

#### T9: 完成构建验证、手工回归与 04-verify.md 回填
- **Status**: ❌ NOT STARTED
- **Required**:
  - 创建 `04-verify.md`
  - 记录 `pnpm run build`、`pnpm run serve` 与 uTools 插件环境验证结果
  - 明确未验证项与残留风险

## Critical Issues Requiring Immediate Attention

### 1. HTML Entry Template Issue
**File**: `public/index.html`
**Problem**: Still uses webpack template variables
**Impact**: Vite build will fail or produce incorrect output
**Fix Required**: Replace `<%= htmlWebpackPlugin.options.title %>` with static title

### 2. Missing Hook Modules
**Files**: `src/hooks/useListNavigation.js`, `src/hooks/useVirtualListScroll.js`
**Problem**: T5 cannot start without these foundation modules
**Impact**: Navigation state and scroll strategy cannot be extracted

### 3. Verification Gap
**File**: `04-verify.md` (missing)
**Problem**: No systematic verification of completed work
**Impact**: Cannot validate Phase A completion before proceeding to Phase B

## Recommended Next Steps

### Priority 1 (Immediate - Blockers)
1. Fix `public/index.html` template variables
2. Create `src/hooks/useListNavigation.js` 
3. Create `src/hooks/useVirtualListScroll.js`
4. Verify basic build and serve functionality
5. Create `04-verify.md` with Phase A verification results

### Priority 2 (Phase B Core)
1. Implement T5: Navigation state extraction
2. Implement T6: Delete/restore coordination
3. Implement T7: Row rendering and style adaptation
4. Implement T8: Hotkey regression testing

### Priority 3 (Finalization)
1. Complete T9: Comprehensive verification and documentation
2. Full uTools plugin environment testing
3. Performance validation against 300ms target

## Risk Assessment

### High Risk
- HTML template issue may prevent successful builds
- Missing hook modules block Phase B progress
- No verification of Phase A completion

### Medium Risk  
- TanStack Virtual integration may have hidden scrolling behavior differences
- Hotkey system may need adaptation to new list structure

### Low Risk
- Style adaptation should be straightforward with existing CSS structure
- Build tool migration appears mostly complete

## Conclusion

Phase A (Vite migration) is ~70% complete but has critical blockers in HTML template and verification. Phase B (TanStack Virtual integration) has foundation in place but requires hook modules and extensive refactoring work. Immediate focus should be on completing Phase A before proceeding with Phase B tasks.
