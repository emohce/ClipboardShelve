# pnpm 安装与使用指南

## 📦 什么是 pnpm？

**pnpm**（Performant npm）是一个快速、节省磁盘空间的包管理器，是 npm 的替代品。

### 主要优势

- ⚡ **安装速度快** - 比 npm 快 2-3 倍
- 💾 **节省磁盘空间** - 使用硬链接，相同依赖只存储一份
- 🔒 **更严格的依赖管理** - 避免幽灵依赖问题
- 📦 **兼容 npm** - 完全兼容 npm 的 package.json

---

## 🚀 安装 pnpm

### 方法 1: 使用 npm 安装（推荐）

```bash
# 全局安装 pnpm
npm install -g pnpm
```

### 方法 2: 使用独立安装脚本

#### Windows (PowerShell)
```powershell
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

#### macOS/Linux
```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### 方法 3: 使用 Homebrew (macOS)

```bash
brew install pnpm
```

### 方法 4: 使用 Scoop (Windows)

```powershell
scoop install nodejs-lts pnpm
```

---

## ✅ 验证安装

安装完成后，验证是否安装成功：

```bash
pnpm --version
```

如果显示版本号（如 `8.15.0`），说明安装成功。

---

## 📝 基本使用

### 常用命令对照表

| 功能 | npm 命令 | pnpm 命令 |
|------|----------|-----------|
| 安装依赖 | `npm install` | `pnpm install` 或 `pnpm i` |
| 安装单个包 | `npm install <package>` | `pnpm add <package>` |
| 安装开发依赖 | `npm install -D <package>` | `pnpm add -D <package>` |
| 卸载包 | `npm uninstall <package>` | `pnpm remove <package>` |
| 更新依赖 | `npm update` | `pnpm update` |
| 运行脚本 | `npm run <script>` | `pnpm run <script>` 或 `pnpm <script>` |
| 查看已安装包 | `npm list` | `pnpm list` |
| 全局安装 | `npm install -g <package>` | `pnpm add -g <package>` |

### 本项目使用示例

```bash
# 1. 安装项目依赖
pnpm install
# 或简写
pnpm i

# 2. 启动开发服务器
pnpm run serve
# 或简写（如果脚本名是 serve）
pnpm serve

# 3. 构建生产版本
pnpm run build
# 或简写
pnpm build
```

---

## 🔄 从 npm 迁移到 pnpm

### 步骤 1: 删除 npm 的锁定文件（可选）

```bash
# 删除 package-lock.json（pnpm 会生成 pnpm-lock.yaml）
rm package-lock.json
```

### 步骤 2: 删除 node_modules（可选）

```bash
# 删除旧的 node_modules
rm -rf node_modules
```

### 步骤 3: 使用 pnpm 安装

```bash
# 使用 pnpm 重新安装依赖
pnpm install
```

### 步骤 4: 验证

```bash
# 运行项目，确保一切正常
pnpm run serve
```

---

## 🎯 本项目快速开始

### 首次使用 pnpm

```bash
# 1. 安装 pnpm（如果还没安装）
npm install -g pnpm

# 2. 进入项目目录
cd ClipboardManager

# 3. 安装依赖
pnpm install

# 4. 启动开发服务器
pnpm run serve
```

### 日常开发

```bash
# 启动开发服务器
pnpm run serve

# 构建生产版本
pnpm run build
```

---

## ⚙️ 配置 pnpm

### 查看配置

```bash
pnpm config list
```

### 常用配置

```bash
# 设置镜像源（加速下载）
pnpm config set registry https://registry.npmmirror.com

# 查看全局安装路径
pnpm config get global-bin-dir

# 查看存储路径
pnpm store path
```

### 使用 .npmrc 文件

在项目根目录创建 `.npmrc` 文件：

```
registry=https://registry.npmmirror.com
shamefully-hoist=true
```

---

## 🔍 常用命令详解

### 安装相关

```bash
# 安装所有依赖
pnpm install

# 安装生产依赖
pnpm add <package>

# 安装开发依赖
pnpm add -D <package>

# 安装全局包
pnpm add -g <package>

# 安装并保存到 package.json
pnpm add <package> --save
```

### 运行脚本

```bash
# 运行 package.json 中的脚本
pnpm run <script-name>

# 简写形式（如果脚本名不冲突）
pnpm <script-name>

# 例如本项目
pnpm serve    # 等同于 pnpm run serve
pnpm build    # 等同于 pnpm run build
```

### 更新相关

```bash
# 更新所有依赖
pnpm update

# 更新指定包
pnpm update <package>

# 更新到最新版本
pnpm update <package> --latest
```

### 查看信息

```bash
# 查看已安装的包
pnpm list

# 查看包的详细信息
pnpm info <package>

# 查看过时的包
pnpm outdated
```

---

## 🐛 常见问题

### 问题 1: 命令未找到

**错误信息**：`pnpm: command not found`

**解决方案**：
1. 检查是否已安装：`npm list -g pnpm`
2. 检查 PATH 环境变量
3. 重新安装：`npm install -g pnpm`

### 问题 2: 权限问题（macOS/Linux）

**错误信息**：`EACCES: permission denied`

**解决方案**：
```bash
# 使用 sudo（不推荐）
sudo npm install -g pnpm

# 或配置 npm 使用其他目录（推荐）
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
npm install -g pnpm
```

### 问题 3: 与 npm 混用导致的问题

**问题**：同时存在 `package-lock.json` 和 `pnpm-lock.yaml`

**解决方案**：
- 选择一种包管理器并坚持使用
- 如果使用 pnpm，删除 `package-lock.json` 和 `node_modules`
- 重新运行 `pnpm install`

### 问题 4: 依赖安装失败

**解决方案**：
```bash
# 清除缓存
pnpm store prune

# 删除 node_modules 和锁定文件后重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## 📚 更多资源

- **官方文档**：https://pnpm.io/
- **GitHub**：https://github.com/pnpm/pnpm
- **迁移指南**：https://pnpm.io/migration

---

## 💡 提示

1. **首次安装较慢**：pnpm 首次安装时会下载并存储包，之后会快很多
2. **磁盘空间**：pnpm 使用全局存储，相同版本的包只存储一份
3. **兼容性**：pnpm 完全兼容 npm 的 package.json，可以无缝切换
4. **团队协作**：建议团队统一使用同一种包管理器（npm 或 pnpm）

---

## ✅ 检查清单

安装完成后，确认以下内容：

- [ ] `pnpm --version` 能显示版本号
- [ ] `pnpm install` 能成功安装依赖
- [ ] `pnpm run serve` 能启动开发服务器
- [ ] 项目能正常运行

如果以上都正常，说明 pnpm 已成功安装并配置完成！
