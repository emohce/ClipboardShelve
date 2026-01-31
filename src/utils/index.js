const { utools, existsSync, writeFileSync, mkdirSync, sep, Buffer } = window.exports
const readFileSync = window.exports.readFileSync

const dateFormat = (timeStamp) => {
  const startTime = new Date(timeStamp) // 开始时间
  const endTime = new Date() // 结束时间
  const gaps = [
    Math.floor((endTime - startTime) / 1000 / 60), // 分钟
    Math.floor((endTime - startTime) / 1000 / 60 / 60), // 小时
    Math.floor((endTime - startTime) / 1000 / 60 / 60 / 24) // 天
  ]
  let info = ''
  if (gaps[2] > 0) {
    info = `${gaps[2]}天前`
  } else if (gaps[1] > 0) {
    info = `${gaps[1]}小时前`
  } else if (gaps[0] > 0) {
    info = `${gaps[0]}分钟前`
  } else {
    info = '刚刚'
  }
  return info
}

const pointToObj = (objWithPointKey) => {
  let rtnObj = {}
  for (const key in objWithPointKey) {
    const keys = key.split('.')
    let obj = rtnObj
    for (let i = 0; i < keys.length; i++) {
      if (i === keys.length - 1) {
        obj[keys[i]] = objWithPointKey[key]
      } else {
        if (!obj[keys[i]]) obj[keys[i]] = {}
        obj = obj[keys[i]]
      }
    }
  }
  return rtnObj
}

const copy = (item, isHideMainWindow = true) => {
  switch (item.type) {
    case 'text':
      utools.copyText(item.data)
      break
    case 'image': {
      const dataUrl = getImageDataUrlForCopy(item)
      if (dataUrl) utools.copyImage(dataUrl)
      break
    }
    case 'file':
      const paths = JSON.parse(item.data).map((file) => file.path)
      utools.copyFile(paths)
      break
  }
  isHideMainWindow && utools.hideMainWindow()
}

const paste = () => {
  if (utools.isMacOs()) utools.simulateKeyboardTap('v', 'command')
  else utools.simulateKeyboardTap('v', 'ctrl')
}

const isUToolsPlugin = () => {
  return typeof utools !== 'undefined' && utools.getNativeId
}

/** 与前端 isValidImageData 一致：仅当 data 为合法 base64 数据 URL */
const isValidImageData = (data) => {
  if (!data || typeof data !== 'string') return false
  return data.startsWith('data:image/') && data.includes('base64,')
}

/** 能展示就能复制：返回可用于 copyImage 的 data URL（base64 或从路径/ file:// 读取） */
const getImageDataUrlForCopy = (item) => {
  if (!item || item.type !== 'image' || !item.data || typeof item.data !== 'string') return null
  if (isValidImageData(item.data)) return item.data
  let path = item.data
  if (path.startsWith('file://')) {
    path = path.slice(path.indexOf('://') + 3).replace(/^\/+/, '').replace(/\//g, sep)
  }
  if (!path) return null
  try {
    const buf = readFileSync(path)
    if (!buf || !buf.length) return null
    const ext = path.split(/[\\/]/).pop().split('.').pop()?.toLowerCase() || ''
    const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' }[ext] || 'image/png'
    const base64 = Buffer.from(buf).toString('base64')
    return `data:${mime};base64,${base64}`
  } catch (e) {
    return null
  }
}

const copyAndPasteAndExit = (item, options = {}) => {
  if (!item) return false
  const {
    exit = true,
    paste: shouldPaste = true,
    respectImageCopyGuard = true,
    delayMs = 80
  } = options

  let didCopy = false
  switch (item.type) {
    case 'text':
      utools.copyText(item.data)
      didCopy = true
      break
    case 'image': {
      const dataUrl = getImageDataUrlForCopy(item)
      if (!dataUrl) {
        if (respectImageCopyGuard) {
          console.warn('[copyAndPasteAndExit] 无可复制的图片数据，终止后续操作')
          return false
        }
        break
      }
      utools.copyImage(dataUrl)
      didCopy = true
      break
    }
    case 'file': {
      const paths = JSON.parse(item.data).map((file) => file.path)
      utools.copyFile(paths)
      didCopy = true
      break
    }
  }

  if (!didCopy) return false

  if (exit && typeof utools.hideMainWindow === 'function') {
    utools.hideMainWindow()
  }

  if (shouldPaste) {
    setTimeout(() => paste(), delayMs)
  }

  return true
}

const copyWithSearchFocus = (item) => {
  if (!item) return false

  const searchInput = document.querySelector('.clip-search-input')
  const isSearchFocused = document.activeElement === searchInput
  if (isSearchFocused) searchInput.blur()

  return copyAndPasteAndExit(item, { respectImageCopyGuard: true })
}

const copyOnly = (item) => {
  // 仅复制到剪切板，不执行任何其他操作
  switch (item.type) {
    case 'text':
      utools.copyText(item.data)
      break
    case 'image': {
      const dataUrl = getImageDataUrlForCopy(item)
      if (dataUrl) utools.copyImage(dataUrl)
      break
    }
    case 'file':
      const paths = JSON.parse(item.data).map((file) => file.path)
      utools.copyFile(paths)
      break
  }
}

const createFile = (item) => {
  const tempPath = utools.getPath('temp')
  const folderPath = tempPath + sep + 'utools-clipboard-manager'
  if (!existsSync(folderPath)) {
    try {
      mkdirSync(folderPath)
    } catch (err) {
      utools.showNotification('创建临时文件夹出错: ' + err)
    }
  }
  const { type } = item
  if (type === 'image') {
    const base64Data = item.data.replace(/^data:image\/\w+;base64,/, '') // remove the prefix
    const buffer = Buffer.from(base64Data, 'base64') // to Buffer
    const filePath = folderPath + sep + new Date().valueOf() + '.png'
    writeFileSync(filePath, buffer)
    return filePath
  } else if (type === 'text') {
    const filePath = folderPath + sep + new Date().valueOf() + '.txt'
    writeFileSync(filePath, item.data)
    return filePath
  }
}

const getNativeId = () => {
  return utools.getNativeId()
}

export { dateFormat, pointToObj, copy, paste, createFile, getNativeId, isUToolsPlugin, copyWithSearchFocus, copyOnly, copyAndPasteAndExit }
