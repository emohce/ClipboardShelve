const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

module.exports = {
  publicPath: './',
  productionSourceMap: false,
  devServer: {
    port: 8081,
    client: {
      overlay: {
        // false：避免自定义 runtimeErrors 被抽到浏览器后丢失闭包（ReferenceError: getOverlayRuntimeErrorMessage）
        // ResizeObserver 已在 initPlugin 里静默；其余运行时错误看控制台即可
        runtimeErrors: false
      }
    }
  },
  chainWebpack: (config) => {
    config.optimization.minimizer('uglify-plugin').use(UglifyJsPlugin, [
      {
        uglifyOptions: {
          drop_console: false,
          drop_debugger: false,
          pure_funcs: ['console.log']
        }
      }
    ])
  }
}
