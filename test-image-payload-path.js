const assert = require('assert')
const fs = require('fs')

async function importUtilsWithExports(exports, tag) {
  globalThis.window = { exports }
  globalThis.utools = exports.utools
  return import(`./src/utils/index.js?imagePayloadPath=${tag}-${Date.now()}`)
}

async function testCreateFileDecodesWideImageMime() {
  const writes = []
  const dirs = new Set()
  const utools = {
    getPath: () => '/user-data',
    isMacOs: () => true,
    showNotification: () => {}
  }
  const exports = {
    utools,
    existsSync: (path) => dirs.has(path),
    mkdirSync: (path) => dirs.add(path),
    writeFileSync: (path, buffer) => writes.push({ path, buffer }),
    readFileSync: fs.readFileSync,
    rmSync: fs.rmSync,
    unlinkSync: fs.unlinkSync,
    rmdirSync: fs.rmdirSync,
    sep: '/',
    crypto: require('crypto'),
    Buffer
  }
  const { createFile } = await importUtilsWithExports(exports, 'svg-mime')
  const filePath = createFile({
    id: 'svg-image',
    type: 'image',
    data: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='
  })
  assert.equal(filePath, '/user-data/utools-clipboard-manager/original-material/svg-image/original.svg')
  assert.equal(writes.length, 1)
  assert.equal(writes[0].buffer.toString('utf8'), '<svg></svg>')
}

async function testCreateFileUsesSharedImagePathResolution() {
  const writes = []
  const dirs = new Set()
  let readPath = ''
  const utools = {
    getPath: () => '/user-data',
    isMacOs: () => true,
    showNotification: () => {}
  }
  const exports = {
    utools,
    existsSync: (path) => dirs.has(path),
    mkdirSync: (path) => dirs.add(path),
    writeFileSync: (path, buffer) => writes.push({ path, buffer }),
    readFileSync: (path) => {
      readPath = path
      if (path !== '/Users/alice/Pictures/source.webp') {
        throw new Error(`unexpected path: ${path}`)
      }
      return Buffer.from('WEBPDATA')
    },
    sep: '/',
    crypto: require('crypto'),
    Buffer
  }
  const { createFile } = await importUtilsWithExports(exports, 'create-file-path')
  const filePath = createFile({
    id: 'file-url-image',
    type: 'image',
    data: 'file:///Users/alice/Pictures/source.webp'
  })
  assert.equal(readPath, '/Users/alice/Pictures/source.webp')
  assert.equal(filePath, '/user-data/utools-clipboard-manager/original-material/file-url-image/original.webp')
  assert.equal(writes.length, 1)
  assert.equal(writes[0].buffer.toString('utf8'), 'WEBPDATA')
}

async function testCopyOnlyReadsMacFileUrlAsAbsolutePath() {
  let readPath = ''
  const copied = []
  const utools = {
    copyImage: (image) => copied.push(image),
    isMacOs: () => true
  }
  const exports = {
    utools,
    existsSync: () => false,
    mkdirSync: () => {},
    writeFileSync: () => {},
    readFileSync: (path) => {
      readPath = path
      if (path !== '/Users/alice/Pictures/screenshot.png') {
        throw new Error(`unexpected path: ${path}`)
      }
      return Buffer.from('PNGDATA')
    },
    sep: '/',
    crypto: require('crypto'),
    Buffer
  }
  const { copyOnly } = await importUtilsWithExports(exports, 'mac-file-url')
  copyOnly({ id: 'mac-image', type: 'image', data: 'file:///Users/alice/Pictures/screenshot.png' })
  assert.equal(readPath, '/Users/alice/Pictures/screenshot.png')
  assert.deepEqual(copied, ['data:image/png;base64,UE5HREFUQQ=='])
}

async function testCopyOnlyReadsWindowsFileUrlAsDrivePath() {
  let readPath = ''
  const copied = []
  const utools = {
    copyImage: (image) => copied.push(image),
    isMacOs: () => false
  }
  const exports = {
    utools,
    existsSync: () => false,
    mkdirSync: () => {},
    writeFileSync: () => {},
    readFileSync: (path) => {
      readPath = path
      if (path !== 'C:\\Users\\alice\\Pictures\\screenshot.png') {
        throw new Error(`unexpected path: ${path}`)
      }
      return Buffer.from('JPGDATA')
    },
    sep: '\\',
    crypto: require('crypto'),
    Buffer
  }
  const { copyOnly } = await importUtilsWithExports(exports, 'win-file-url')
  copyOnly({ id: 'win-image', type: 'image', data: 'file:///C:/Users/alice/Pictures/screenshot.png' })
  assert.equal(readPath, 'C:\\Users\\alice\\Pictures\\screenshot.png')
  assert.deepEqual(copied, ['data:image/png;base64,SlBHREFUQQ=='])
}

function testOperationsHydratePartialImageBeforeRedirect() {
  const source = fs.readFileSync('./src/hooks/useClipOperate.js', 'utf8')
  assert.match(source, /const hydrateOperationItem = \(item\) =>/)
  assert.match(source, /handleOperateClick: \(operation, item, meta = \{\}\) => \{\s*item = hydrateOperationItem\(item\);/s)
  assert.match(source, /filterOperate: \(operation, item, isFullData, context\) => \{\s*item = hydrateOperationItem\(item\);/s)
  assert.match(source, /id === "save-file"[\s\S]*utools\.redirect\("收集文件"/)
  assert.match(source, /id\.indexOf\("custom"\) !== -1[\s\S]*utools\.redirect\(a\[1\]/)
}

async function main() {
  await testCreateFileDecodesWideImageMime()
  await testCreateFileUsesSharedImagePathResolution()
  await testCopyOnlyReadsMacFileUrlAsAbsolutePath()
  await testCopyOnlyReadsWindowsFileUrlAsDrivePath()
  testOperationsHydratePartialImageBeforeRedirect()
  console.log('image payload/path tests passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
