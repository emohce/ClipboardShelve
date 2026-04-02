const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

const RESIZE_OBSERVER_ERROR_PATTERNS = [
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications'
]

const getOverlayRuntimeErrorMessage = (error) => {
  return [
    error?.message,
    error?.error?.message,
    error?.reason?.message,
    typeof error?.reason === 'string' ? error.reason : '',
    typeof error === 'string' ? error : ''
  ]
    .filter(Boolean)
    .join(' | ')
}

module.exports = {
  publicPath: './',
  productionSourceMap: false,
  devServer: {
    port: 8081,
    client: {
      overlay: {
        runtimeErrors: (error) => {
          const message = getOverlayRuntimeErrorMessage(error)
          return !RESIZE_OBSERVER_ERROR_PATTERNS.some((pattern) =>
            message.includes(pattern)
          )
        }
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
