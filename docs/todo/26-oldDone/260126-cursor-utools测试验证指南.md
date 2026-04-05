# uTools 内测试验证指南

## 🎯 测试环境准备

### 1. 安装依赖

```bash
pnpm i
```

### 2. 启动开发服务器

```bash
pnpm run serve
```

开发服务器将在 `http://localhost:8081/` 启动。

> **注意**：如果 `vue.config.js` 中未配置端口，vue-cli-service 默认使用 8080 端口。如果实际启动端口与 `plugin.json` 中的端口不一致，需要：
> - 在 `vue.config.js` 中配置 `devServer.port: 8081`，或
> - 修改 `plugin.json` 中的 `development.main` 为实际端口

---

## 📦 在 uTools 中加载插件

### 方式一：开发模式（推荐用于开发调试）

1. **确保开发服务器正在运行**
   - 执行 `pnpm run serve` 后，确认控制台显示服务器已启动
   - 默认地址：`http://localhost:8081/`

2. **在 uTools 中加载插件**
   - 打开 uTools
   - 进入"插件市场"或"开发者工具"
   - 选择"加载本地插件"或"开发者模式"
   - 选择项目根目录（包含 `plugin.json` 的目录）
   - uTools 会自动读取 `plugin.json` 中的 `development.main` 配置（`http://localhost:8081/`）

3. **验证插件加载**
   - 在 uTools 中搜索"剪切板"、"剪贴板"或"Clipboard"
   - 插件应该能正常打开并显示界面

### 方式二：生产模式（用于最终测试）

1. **构建生产版本**
   ```bash
   pnpm run build
   ```
   构建产物将输出到 `dist/` 目录

2. **在 uTools 中加载插件**
   - 选择项目根目录（包含 `plugin.json` 的目录）
   - uTools 会读取 `plugin.json` 中的 `main` 配置（`index.html`）
   - 从 `dist/` 目录加载构建后的文件

---

## 🔍 测试验证步骤

### 基础功能测试

#### 1. 插件启动测试

- [ ] 插件能正常打开
- [ ] 界面显示正常，无报错
- [ ] 控制台无 JavaScript 错误（按 `F12` 打开开发者工具）

#### 2. 剪贴板监听测试

**步骤**：
1. 打开插件开发者工具（`F12` 或 `Ctrl + Shift + I`）
2. 在控制台执行以下脚本检查监听器状态：

```javascript
// 检查监听器状态
console.log('监听器状态:', window.listener.listening)
console.log('监听器对象:', window.listener)
```

3. 复制一段文本（如："测试内容"）
4. 等待 1-2 秒
5. 检查数据库是否有新记录：

```javascript
// 检查数据库记录
console.log('数据库记录数:', window.db.dataBase.data.length)
console.log('最新记录:', window.db.dataBase.data[0])
```

**预期结果**：
- 监听器状态为 `true`
- 复制内容后，数据库记录数增加
- 最新记录包含刚才复制的内容

#### 3. 剪贴板历史显示测试

- [ ] 复制多条不同内容后，历史列表正常显示
- [ ] 历史记录按时间倒序排列（最新的在最上面）
- [ ] 可以正常查看历史记录详情

#### 4. 搜索功能测试

- [ ] 在搜索框输入关键词，能正确过滤历史记录
- [ ] 搜索支持中文、英文、数字
- [ ] 清空搜索后，显示全部历史

#### 5. 粘贴功能测试

- [ ] 点击历史记录后，内容能正确粘贴到当前活动窗口
- [ ] 文本、图片、文件都能正常粘贴

#### 6. 收藏功能测试

- [ ] 可以收藏历史记录
- [ ] 收藏的记录不会被自动清理
- [ ] 可以在收藏列表中查看收藏的记录

#### 7. 删除功能测试

- [ ] 可以删除单条历史记录
- [ ] 可以清空所有历史记录
- [ ] 删除后数据库正确更新

---

## 🛠️ 开发模式特殊注意事项

### Preload 脚本更新

根据 `CONTRIBUTE.md` 说明：
> **开发热更新 (仅视图, preload需要在开发者工具中手动重启插件)**

这意味着：
- Vue 组件和样式修改后会自动热更新
- 但 `preload.js` 的修改需要手动重启插件才能生效

**重启插件方法**：
1. 在 uTools 中关闭插件窗口
2. 重新打开插件（搜索"剪切板"等关键词）

### 监听程序测试

开发模式下，剪贴板监听功能需要：

1. **检查监听程序状态**
   - 打开插件设置页面（点击 💡 按钮）
   - 查看"剪贴板监听程序状态"
   - 如果显示"未安装"，需要手动安装监听程序（参考 [剪贴板监听问题排查.md](./剪贴板监听问题排查.md)）

2. **测试监听功能**
   - 如果原生监听程序不可用，插件会自动降级到轮询模式（每 300ms 检查一次）
   - 轮询模式功能正常，但响应可能稍慢

---

## 🐛 调试技巧

### 1. 使用开发者工具

在插件窗口中按 `F12` 打开开发者工具，可以：
- 查看控制台日志和错误
- 检查网络请求
- 调试 JavaScript 代码
- 检查 DOM 结构

### 2. 监听器调试脚本

在控制台执行完整调试脚本（参考 [剪贴板监听问题排查.md](./剪贴板监听问题排查.md)）：

```javascript
// ===== 剪贴板监听调试脚本 =====

console.log('=== 开始调试剪贴板监听 ===\n')

// 1. 检查监听器状态
console.log('1. 监听器状态:', window.listener.listening)
console.log('   监听器对象:', window.listener)

// 2. 检查数据库路径
const setting = utools.dbStorage.getItem('setting')
const os = require('os')
const crypto = require('crypto')
const nativeId = crypto.createHash('md5').update(os.hostname()).digest('hex').substring(0, 8)
const dbPath = setting.database.path[nativeId] || setting.database.path
console.log('\n2. 数据库路径:', dbPath)

// 3. 检查数据库
console.log('\n3. 数据库记录数:', window.db.dataBase.data.length)
console.log('   最新记录:', window.db.dataBase.data[0])

// 4. 注册事件监听
console.log('\n4. 注册事件监听器...')
window.listener.on('change', () => {
  console.log('   ✅ 检测到剪贴板变化!')
  console.log('   最新记录:', window.db.dataBase.data[0])
})
window.listener.on('error', (error) => {
  console.error('   ❌ 监听器错误:', error)
})

console.log('\n=== 调试完成，请尝试复制一些内容 ===')
```

### 3. 实时监控剪贴板变化

```javascript
// 实时监控剪贴板变化
window.listener.on('change', () => {
  console.log('✅ 检测到剪贴板变化!')
  console.log('最新记录:', window.db.dataBase.data[0])
})

// 监听错误
window.listener.on('error', (error) => {
  console.error('❌ 监听器错误:', error)
})
```

---

## ✅ 测试检查清单

### 功能测试

- [ ] 插件能正常启动和关闭
- [ ] 剪贴板监听正常工作（原生或轮询模式）
- [ ] 文本复制能被正确记录
- [ ] 图片复制能被正确记录
- [ ] 文件复制能被正确记录
- [ ] 历史记录正确显示
- [ ] 搜索功能正常
- [ ] 粘贴功能正常
- [ ] 收藏功能正常
- [ ] 删除功能正常
- [ ] 设置页面功能正常

### 兼容性测试

- [ ] Windows 系统测试
- [ ] Linux 系统测试（如适用）
- [ ] macOS 系统测试（如适用）
- [ ] 不同 uTools 版本测试

### 性能测试

- [ ] 大量历史记录（100+ 条）时界面流畅
- [ ] 复制大文件时响应正常
- [ ] 长时间运行无内存泄漏

### 边界测试

- [ ] 空剪贴板处理
- [ ] 超长文本处理
- [ ] 特殊字符处理
- [ ] 数据库文件损坏恢复

---

## 📝 常见问题

### 问题 1: 开发服务器启动后，uTools 无法连接

**解决方案**：
1. **确认端口一致**：
   - 检查 `pnpm run serve` 启动时显示的端口号
   - 确认 `plugin.json` 中 `development.main` 的端口与启动端口一致
   - 如果端口不一致，修改 `vue.config.js` 添加 `devServer: { port: 8081 }` 或修改 `plugin.json` 中的端口
2. 检查防火墙是否阻止了连接
3. 尝试在浏览器中直接访问开发服务器地址确认服务器正常

### 问题 2: 修改代码后，插件没有更新

**解决方案**：
1. 如果是 Vue 组件修改，等待热更新（通常自动完成）
2. 如果是 `preload.js` 修改，需要重启插件
3. 如果是 `plugin.json` 修改，需要重新加载插件

### 问题 3: 监听功能不工作

**解决方案**：
参考 [剪贴板监听问题排查.md](./剪贴板监听问题排查.md) 进行排查

---

## 🎯 快速测试流程

1. **启动开发服务器**
   ```bash
   pnpm run serve
   ```

2. **在 uTools 中加载插件**
   - 选择项目根目录
   - 搜索"剪切板"打开插件

3. **打开开发者工具**
   - 按 `F12` 打开控制台

4. **测试剪贴板监听**
   - 复制一段文本
   - 检查控制台是否有日志
   - 检查历史记录是否更新

5. **测试其他功能**
   - 搜索、粘贴、收藏、删除等

---

## 📚 相关文档

- [剪贴板监听问题排查.md](./剪贴板监听问题排查.md) - 监听功能问题排查
- [查找数据库和监听程序路径.md](./查找数据库和监听程序路径.md) - 路径查找方法
- [CONTRIBUTE.md](./CONTRIBUTE.md) - 开发贡献指南
