# 打包流程（以当前项目为例）

1. 安装依赖：在项目根目录执行 `npm install`，准备好 `vue-cli-service` 等打包所需依赖。脚本定义在 `package.json` 的 `build` 命令里，对应 `vue-cli-service build`。@package.json#1-19
2. 配置核对：确保 `public/plugin.json` 中的信息（插件名、主页、入口 `main: "index.html"`、预加载 `preload.js` 等）正确，打包后会被复制到 `dist` 根目录，作为 uTools 识别插件的元数据。@public/plugin.json#1-20
3. 生产构建：执行 `npm run build`。该命令会使用 `vue.config.js` 里设置的 `publicPath: './'` 与生产优化配置，将 Vue 工程编译到 `dist/`，同时包含 `plugin.json`、图标、`index.html` 等资源，形成 uTools 要求的文件结构。@vue.config.js#1-20
4. 生成安装包：进入 `dist/`，将目录内容（保持 `plugin.json` 在根）压缩为 zip，然后按 uTools 规范改名，例如 `ClipboardManager-1.0.0.upx`。必要时可顺带更新 `plugin.json` 中的版本号（若添加 `version` 字段）以便审核。
5. 本地验证：打开 uTools 开发者工具，选择「加载本地插件」，指向 `dist/` 或 `.upx` 以测试功能是否正常（包括 `preload.js` 与主界面）。
6. 发布到插件市场：登录 uTools 开发者后台（https://u.tools/ → 开发者），创建/更新插件条目，填写介绍、截图等信息，再上传 `.upx` 包提交审核。审核通过后即可在商店上架。

提示：若需要调试热更新，可利用 `plugin.json` 的 `development.main` 指向 `http://localhost:8081/`（dev server 端口由 `vue.config.js` 中的 `devServer.port` 指定），配合 `npm run serve` 进行联调。@public/plugin.json#8-20 @vue.config.js#3-8