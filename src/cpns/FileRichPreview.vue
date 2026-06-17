<template>
  <div class="file-rich-preview" :class="[`file-rich-preview--${mode}`, `is-${status}`]">
    <div class="file-rich-preview__header" v-if="activeFile">
      <span class="file-rich-preview__badge">{{ kindLabel }}</span>
      <span class="file-rich-preview__name" :title="activeFile.path">{{ activeFile.name }}</span>
      <span v-if="fileCount > 1" class="file-rich-preview__count">{{ fileCountLabel }}</span>
    </div>
    <div
      ref="contentRef"
      class="file-rich-preview__content"
      :class="{
        'is-table': preview.type === 'table',
        'is-html': preview.type === 'html',
        'is-text': preview.type === 'text',
        'is-pdf': preview.type === 'pdf',
        'is-slides': preview.type === 'slides',
      }"
      @scroll="handleContentScroll"
    >
      <div v-if="status === 'idle'" class="file-rich-preview__empty">暂无可预览文件</div>
      <div v-else-if="status === 'loading'" class="file-rich-preview__state">加载中</div>
      <div v-else-if="status === 'oversize'" class="file-rich-preview__state">
        文件过大，已跳过内嵌预览
      </div>
      <div v-else-if="status === 'error'" class="file-rich-preview__state">
        {{ errorMessage || '预览失败' }}
      </div>
      <template v-else>
        <img
          v-if="preview.type === 'image'"
          class="file-rich-preview__image"
          :src="preview.src"
          :alt="activeFile?.name || 'image'"
        />
        <pre v-else-if="preview.type === 'text'" class="file-rich-preview__text">{{ preview.text }}</pre>
        <div v-else-if="preview.type === 'html'" class="file-rich-preview__html" v-html="preview.html"></div>
        <div v-else-if="preview.type === 'table'" class="file-rich-preview__table-wrap">
          <div class="file-rich-preview__sheet" v-if="preview.sheetName">{{ preview.sheetName }}</div>
          <table class="file-rich-preview__table">
            <tbody>
              <tr v-for="(row, rowIndex) in preview.rows" :key="rowIndex">
                <td v-for="(cell, cellIndex) in row" :key="`${rowIndex}-${cellIndex}`">
                  {{ cell }}
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="preview.truncatedRows || preview.truncatedCols" class="file-rich-preview__note">
            已截取预览
          </div>
        </div>
        <div v-else-if="preview.type === 'slides'" class="file-rich-preview__slides">
          <article
            v-for="slide in preview.slides"
            :key="slide.index"
            class="file-rich-preview__slide"
          >
            <div class="file-rich-preview__slide-index">Slide {{ slide.index }}</div>
            <div v-if="slide.title" class="file-rich-preview__slide-title">{{ slide.title }}</div>
            <ul v-if="slide.lines.length" class="file-rich-preview__slide-text">
              <li v-for="(line, lineIndex) in slide.lines" :key="`${slide.index}-${lineIndex}`">
                {{ line }}
              </li>
            </ul>
            <div v-else class="file-rich-preview__note">无可提取文本</div>
          </article>
          <div v-if="preview.truncatedSlides" class="file-rich-preview__note">
            已截取部分幻灯片
          </div>
        </div>
        <div v-else-if="preview.type === 'pdf'" class="file-rich-preview__pdf">
          <div class="file-rich-preview__sheet">PDF · {{ preview.renderedPages }}/{{ preview.pageCount }}</div>
          <img
            v-for="page in preview.pages"
            :key="page.pageNumber"
            class="file-rich-preview__pdf-page"
            :src="page.src"
            :alt="`PDF page ${page.pageNumber}`"
          />
          <div v-if="pdfRendering" class="file-rich-preview__state">加载更多页面</div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import {
  classifyFilePreview,
  getFileSizeLimit,
  getFileSizeState,
  getPreviewableFile,
  parseFileItemData,
  sanitizePreviewHtml,
  sliceTablePreview
} from '../utils/filePreview.mjs'
import { getPreviewScrollAxis } from '../utils/previewScroll.mjs'

const props = defineProps({
  item: { type: Object, default: null },
  file: { type: Object, default: null },
  mode: { type: String, default: 'hover' }
})

const contentRef = ref(null)
const status = ref('idle')
const errorMessage = ref('')
const preview = ref({ type: 'empty' })
const pdfDocRef = ref(null)
const pdfRendering = ref(false)
let loadToken = 0
let activePdfObjectUrls = []
let activePdfCacheKey = ''
let scheduledPdfRender = null

const PDF_RUNTIME_CACHE_KEY = '__EZ_CLIPBOARD_PDF_PREVIEW_RUNTIME__'
const PDF_FIRST_PAGE_CACHE_LIMIT = 6
const PDF_INITIAL_PAGE_COUNT = 1
const PDF_NEXT_PAGE_COUNT = 1
const PDF_MIN_RENDER_SCALE = 0.7
const PDF_HOVER_RENDER_SCALE_CAP = 0.95
const PDF_FULL_RENDER_SCALE_CAP = 1.15
const PDF_CONTENT_HORIZONTAL_PADDING = 28
const PDF_SHARP_DENSITY = 96
const PDF_SHARP_RENDER_WIDTH = 960
const DOCUMENT_PREVIEW_CACHE_LIMIT = 12
const DOCUMENT_TEXT_PREVIEW_BYTES = 1024 * 1024
const DOCUMENT_CSV_PREVIEW_BYTES = 512 * 1024
const PRESENTATION_PREVIEW_MAX_SLIDES = 20
const PRESENTATION_PREVIEW_MAX_LINES = 20

function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

function createPdfPerfContext() {
  return {
    startedAt: nowMs(),
    statMs: 0,
    readMs: 0,
    firstPageMs: 0,
    backend: '',
    fallbackReason: ''
  }
}

function shouldDebugPdfPerf() {
  try {
    const runtime = getRuntimeExports()
    return runtime.utools?.isDev?.() === true || globalThis.__EZ_CLIPBOARD_DEBUG_PDF_PREVIEW__ === true
  } catch (_) {
    return false
  }
}

function debugPdfPerf(perf) {
  if (!perf || !shouldDebugPdfPerf()) return
  console.debug('[FileRichPreview] pdf perf', {
    statMs: Math.round(perf.statMs || 0),
    readMs: Math.round(perf.readMs || 0),
    firstPageMs: Math.round(perf.firstPageMs || 0),
    backend: perf.backend || 'unknown',
    fallbackReason: perf.fallbackReason || ''
  })
}

function getPdfRuntimeCache() {
  if (typeof globalThis === 'undefined') {
    return { modulePromise: null, firstPageCache: new Map() }
  }
  if (!globalThis[PDF_RUNTIME_CACHE_KEY]) {
    globalThis[PDF_RUNTIME_CACHE_KEY] = {
      modulePromise: null,
      firstPageCache: new Map(),
      documentPreviewCache: new Map()
    }
  }
  if (!globalThis[PDF_RUNTIME_CACHE_KEY].documentPreviewCache) {
    globalThis[PDF_RUNTIME_CACHE_KEY].documentPreviewCache = new Map()
  }
  return globalThis[PDF_RUNTIME_CACHE_KEY]
}

function revokePdfObjectUrl(url) {
  if (!url || !/^blob:/i.test(url) || typeof URL === 'undefined') return
  try {
    URL.revokeObjectURL(url)
  } catch (_) {}
}

function releaseSinglePdfObjectUrl(url) {
  revokePdfObjectUrl(url)
  activePdfObjectUrls = activePdfObjectUrls.filter((activeUrl) => activeUrl !== url)
}

function releaseActivePdfObjectUrls() {
  activePdfObjectUrls.forEach(revokePdfObjectUrl)
  activePdfObjectUrls = []
}

function cancelScheduledPdfRender() {
  if (!scheduledPdfRender) return
  try {
    if (scheduledPdfRender.type === 'idle' && typeof window !== 'undefined') {
      window.cancelIdleCallback?.(scheduledPdfRender.id)
    } else {
      clearTimeout(scheduledPdfRender.id)
    }
  } catch (_) {}
  scheduledPdfRender = null
}

function releasePdfDocument() {
  cancelScheduledPdfRender()
  const pdf = pdfDocRef.value
  pdfDocRef.value = null
  pdfRendering.value = false
  activePdfCacheKey = ''
  releaseActivePdfObjectUrls()
  try {
    pdf?.destroy?.()
  } catch (_) {}
}

const files = computed(() => {
  if (props.file?.path) return [{ path: props.file.path, name: props.file.name }]
  if (!props.item || props.item.type !== 'file') return []
  return parseFileItemData(props.item.data)
})

const activeFile = computed(() => {
  if (props.file?.path) {
    const kind = props.file.kind || classifyFilePreview(props.file.path)
    return { path: props.file.path, name: props.file.name || props.file.path.split(/[/\\]/).pop(), kind }
  }
  return getPreviewableFile(files.value)
})

const fileCount = computed(() => files.value.length)
const fileCountLabel = computed(() => `${files.value.findIndex((file) => file.path === activeFile.value?.path) + 1}/${fileCount.value}`)
const kindLabel = computed(() => {
  const labels = {
    image: 'IMG',
    pdf: 'PDF',
    markdown: 'MD',
    asciidoc: 'AD',
    csv: 'CSV',
    spreadsheet: 'XLS',
    word: 'DOCX',
    presentation: 'PPTX',
    text: 'TXT'
  }
  return labels[activeFile.value?.kind] || 'FILE'
})

function getFileUrl(path = '') {
  if (!path) return ''
  if (/^file:\/\//i.test(path)) return path
  return `file:///${path.replace(/\\/g, '/').replace(/^\/+/, '')}`
}

function getRuntimeExports() {
  return typeof window !== 'undefined' ? window.exports || {} : {}
}

function getFileStatInfo(path) {
  const runtime = getRuntimeExports()
  try {
    const stat = runtime.statSync?.(path)
    if (!stat) return { size: 0, mtimeMs: 0 }
    return {
      size: Number.isFinite(Number(stat.size)) ? Number(stat.size) : 0,
      mtimeMs: Number.isFinite(Number(stat.mtimeMs)) ? Number(stat.mtimeMs) : 0
    }
  } catch (_) {
    return { size: 0, mtimeMs: 0 }
  }
}

function getFileSize(path, fallbackBytes = 0) {
  const stat = getFileStatInfo(path)
  if (stat.size) return stat.size
  return Math.max(0, Number(fallbackBytes) || 0)
}

function readTextFile(path) {
  const runtime = getRuntimeExports()
  const readFileSync = runtime.readFileSync
  if (typeof readFileSync !== 'function') throw new Error('当前环境不支持读取文件')
  return String(readFileSync(path, { encoding: 'utf8' }) || '')
}

function readBinaryFile(path) {
  const runtime = getRuntimeExports()
  const readFileSync = runtime.readFileSync
  if (typeof readFileSync !== 'function') throw new Error('当前环境不支持读取文件')
  const raw = readFileSync(path)
  if (raw instanceof Uint8Array) return raw
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw)
  const BufferCtor = runtime.Buffer || globalThis.Buffer
  if (BufferCtor?.from) return new Uint8Array(BufferCtor.from(raw || ''))
  return new TextEncoder().encode(String(raw || ''))
}

async function readTextFilePreview(path, options = {}) {
  const runtime = getRuntimeExports()
  if (typeof runtime.readTextPreviewFile === 'function') {
    const result = await runtime.readTextPreviewFile(path, options)
    if (result?.ok) {
      return {
        text: String(result.text || ''),
        truncated: result.truncated === true,
        backend: result.backend || 'fs-async-text',
        elapsedMs: Number(result.elapsedMs) || 0
      }
    }
  }
  return {
    text: readTextFile(path),
    truncated: false,
    backend: 'readFileSync'
  }
}

async function readBinaryFilePreview(path, options = {}) {
  const runtime = getRuntimeExports()
  if (typeof runtime.readBinaryPreviewFile === 'function') {
    const result = await runtime.readBinaryPreviewFile(path, options)
    if (result?.ok) {
      const data = result.data
      return {
        bytes: data instanceof Uint8Array ? data : new Uint8Array(data || []),
        backend: result.backend || 'fs-async-binary',
        elapsedMs: Number(result.elapsedMs) || 0
      }
    }
  }
  return {
    bytes: readBinaryFile(path),
    backend: 'readFileSync'
  }
}

function toArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

function getDocumentPreviewCacheKey(file) {
  const stat = getFileStatInfo(file.path)
  return `${file.kind}:${file.path}:${stat.size}:${stat.mtimeMs}:${props.mode}`
}

function getCachedDocumentPreview(cacheKey) {
  const cache = getPdfRuntimeCache().documentPreviewCache
  const entry = cache.get(cacheKey)
  if (!entry) return null
  cache.delete(cacheKey)
  cache.set(cacheKey, entry)
  return entry
}

function setCachedDocumentPreview(cacheKey, entry) {
  if (!cacheKey || !entry?.type) return
  const cache = getPdfRuntimeCache().documentPreviewCache
  cache.delete(cacheKey)
  cache.set(cacheKey, entry)
  while (cache.size > DOCUMENT_PREVIEW_CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value
    cache.delete(oldestKey)
  }
}

function canCacheDocumentPreview(file) {
  return ['text', 'markdown', 'asciidoc', 'csv', 'spreadsheet', 'word', 'presentation'].includes(file?.kind)
}

function getTextPreviewByteLimit(kind) {
  if (kind === 'csv') return DOCUMENT_CSV_PREVIEW_BYTES
  return DOCUMENT_TEXT_PREVIEW_BYTES
}

function formatTextByFile(path, text) {
  if (classifyFilePreview(path) !== 'text') return text
  const ext = path.split('.').pop()?.toLowerCase()
  if (ext !== 'json') return text
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch (_) {
    return text
  }
}

async function sanitizeHtml(html) {
  try {
    const module = await import('dompurify')
    const DOMPurify = module.default || module
    return sanitizePreviewHtml(html, (source) =>
      DOMPurify.sanitize(source, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['target', 'rel']
      })
    )
  } catch (_) {
    return sanitizePreviewHtml(html)
  }
}

async function loadMarkdown(file) {
  const { text } = await readTextFilePreview(file.path, {
    maxBytes: getTextPreviewByteLimit(file.kind)
  })
  const module = await import('markdown-it')
  const MarkdownIt = module.default || module
  const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true })
  return {
    type: 'html',
    html: await sanitizeHtml(markdown.render(text))
  }
}

async function loadAsciiDoc(file) {
  const { text } = await readTextFilePreview(file.path, {
    maxBytes: getTextPreviewByteLimit(file.kind)
  })
  const module = await import('@asciidoctor/core')
  const Asciidoctor = module.default || module
  const asciidoctor = Asciidoctor()
  const html = asciidoctor.convert(text, {
    safe: 'safe',
    backend: 'html5',
    attributes: { showtitle: true }
  })
  return {
    type: 'html',
    html: await sanitizeHtml(html)
  }
}

async function loadTable(file) {
  let rows = []
  let sheetName = ''
  if (file.kind === 'csv') {
    const module = await import('papaparse')
    const Papa = module.default || module
    const { text, truncated } = await readTextFilePreview(file.path, {
      maxBytes: getTextPreviewByteLimit(file.kind)
    })
    const parsed = Papa.parse(text, {
      skipEmptyLines: false
    })
    rows = Array.isArray(parsed.data) ? parsed.data : []
    sheetName = 'CSV'
    const preview = sliceTablePreview(rows)
    return {
      type: 'table',
      sheetName,
      ...preview,
      truncatedRows: preview.truncatedRows || truncated
    }
  } else {
    const module = await import('read-excel-file/universal')
    const readXlsxFile = module.default || module.readXlsxFile
    const { bytes } = await readBinaryFilePreview(file.path, {
      maxBytes: getFileSizeLimit(file.kind)
    })
    rows = await readXlsxFile(toArrayBuffer(bytes))
    sheetName = 'Sheet 1'
  }
  return {
    type: 'table',
    sheetName,
    ...sliceTablePreview(rows)
  }
}

async function loadWord(file) {
  const module = await import('mammoth/mammoth.browser')
  const mammoth = module.default || module
  const { bytes } = await readBinaryFilePreview(file.path, {
    maxBytes: getFileSizeLimit(file.kind)
  })
  const result = await mammoth.convertToHtml(
    { arrayBuffer: toArrayBuffer(bytes) },
    { externalFileAccess: false }
  )
  return {
    type: 'html',
    html: await sanitizeHtml(result.value || '')
  }
}

function decodeXmlText(value = '') {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function extractPptxSlideText(xml = '') {
  const lines = []
  const seen = new Set()
  const textPattern = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g
  let match = textPattern.exec(xml)
  while (match) {
    const text = decodeXmlText(match[1]).replace(/\s+/g, ' ').trim()
    if (text && !seen.has(text)) {
      seen.add(text)
      lines.push(text)
    }
    match = textPattern.exec(xml)
  }
  return lines
}

function getPptxSlideIndex(path = '') {
  const match = String(path).match(/ppt\/slides\/slide(\d+)\.xml$/)
  return Number(match?.[1]) || 0
}

async function loadPresentation(file) {
  const module = await import('jszip')
  const JSZip = module.default || module
  const { bytes } = await readBinaryFilePreview(file.path, {
    maxBytes: getFileSizeLimit(file.kind)
  })
  const zip = await JSZip.loadAsync(toArrayBuffer(bytes))
  const slideFiles = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => getPptxSlideIndex(a) - getPptxSlideIndex(b))
  const slides = []
  for (const path of slideFiles.slice(0, PRESENTATION_PREVIEW_MAX_SLIDES)) {
    const xml = await zip.files[path].async('string')
    const extractedLines = extractPptxSlideText(xml)
    const [title = '', ...bodyLines] = extractedLines
    slides.push({
      index: getPptxSlideIndex(path) || slides.length + 1,
      title,
      lines: bodyLines.slice(0, PRESENTATION_PREVIEW_MAX_LINES)
    })
  }
  return {
    type: 'slides',
    slides,
    truncatedSlides: slideFiles.length > PRESENTATION_PREVIEW_MAX_SLIDES
  }
}

function getPdfRenderScale(baseViewport) {
  const contentWidth = contentRef.value?.clientWidth || 720
  const availableWidth = Math.max(240, contentWidth - PDF_CONTENT_HORIZONTAL_PADDING)
  const fitScale = availableWidth / Math.max(1, baseViewport.width)
  const scaleCap = props.mode === 'full' ? PDF_FULL_RENDER_SCALE_CAP : PDF_HOVER_RENDER_SCALE_CAP
  return Math.min(scaleCap, Math.max(PDF_MIN_RENDER_SCALE, fitScale))
}

function createPdfObjectUrl(blob) {
  if (!blob || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('无法生成 PDF 预览图片')
  }
  const src = URL.createObjectURL(blob)
  activePdfObjectUrls.push(src)
  return src
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== 'function') {
      reject(new Error('当前环境不支持快速生成 PDF 预览图片'))
      return
    }
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('PDF 预览图片生成失败'))
      }
    }, 'image/png')
  })
}

async function renderPdfPage(pdf, pageNumber) {
  const page = await pdf.getPage(pageNumber)
  const baseViewport = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: getPdfRenderScale(baseViewport) })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法创建 PDF 预览画布')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  try {
    await page.render({ canvasContext: context, viewport }).promise
    const blob = await canvasToBlob(canvas)
    return {
      page: {
        pageNumber,
        src: createPdfObjectUrl(blob)
      },
      blob
    }
  } finally {
    page.cleanup?.()
  }
}

function getPdfFirstPageCacheKey(file) {
  const startedAt = nowMs()
  const stat = getFileStatInfo(file.path)
  const perf = file.__pdfPerf
  if (perf) perf.statMs += nowMs() - startedAt
  return `${file.path}:${stat.size}:${stat.mtimeMs}:${props.mode}`
}

function getCachedPdfFirstPage(cacheKey) {
  const cache = getPdfRuntimeCache().firstPageCache
  const entry = cache.get(cacheKey)
  if (!entry) return null
  cache.delete(cacheKey)
  cache.set(cacheKey, entry)
  return entry
}

function setCachedPdfFirstPage(cacheKey, entry) {
  if (!cacheKey || (!entry?.blob && !entry?.src)) return
  const cache = getPdfRuntimeCache().firstPageCache
  cache.delete(cacheKey)
  cache.set(cacheKey, entry)
  while (cache.size > PDF_FIRST_PAGE_CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value
    cache.delete(oldestKey)
  }
}

function createCachedPdfPage(entry) {
  if (entry?.src) {
    return {
      pageNumber: 1,
      src: entry.src,
      backend: entry.backend || 'cache'
    }
  }
  return {
    pageNumber: 1,
    src: createPdfObjectUrl(entry.blob),
    backend: entry.backend || 'pdfjs'
  }
}

async function tryLoadPdfSharpFirstPage(file, cacheKey, token, perf) {
  const runtime = getRuntimeExports()
  const renderer = runtime.renderPdfFirstPagePreview
  if (typeof renderer !== 'function') {
    perf.fallbackReason = 'runtime-renderer-unavailable'
    return null
  }
  const startedAt = nowMs()
  try {
    const result = await renderer(file.path, {
      density: PDF_SHARP_DENSITY,
      maxWidth: PDF_SHARP_RENDER_WIDTH,
      mode: props.mode
    })
    perf.firstPageMs = nowMs() - startedAt
    if (token !== loadToken) return null
    if (!result?.ok || !result.src) {
      perf.fallbackReason = result?.error || 'sharp-render-failed'
      return null
    }
    const entry = {
      src: result.src,
      pageCount: 1,
      backend: 'utools-sharp',
      width: result.width || 0,
      height: result.height || 0
    }
    setCachedPdfFirstPage(cacheKey, entry)
    preview.value = {
      type: 'pdf',
      pageCount: 1,
      renderedPages: 1,
      pages: [createCachedPdfPage(entry)]
    }
    status.value = 'ready'
    perf.backend = 'utools-sharp'
    await nextTick()
    return entry
  } catch (error) {
    perf.firstPageMs = nowMs() - startedAt
    perf.fallbackReason = error?.message || 'sharp-render-threw'
    return null
  }
}

async function renderNextPdfPages(count = PDF_NEXT_PAGE_COUNT, token = loadToken) {
  const pdf = pdfDocRef.value
  if (!pdf || pdfRendering.value) return
  const current = preview.value?.pages?.length || 0
  if (current >= pdf.numPages) return
  pdfRendering.value = true
  try {
    const end = Math.min(pdf.numPages, current + count)
    const pages = []
    for (let pageNumber = current + 1; pageNumber <= end; pageNumber += 1) {
      if (token !== loadToken || pdf !== pdfDocRef.value) return
      const rendered = await renderPdfPage(pdf, pageNumber)
      if (token !== loadToken || pdf !== pdfDocRef.value) {
        releaseSinglePdfObjectUrl(rendered.page?.src)
        return
      }
      if (pageNumber === 1) {
        setCachedPdfFirstPage(activePdfCacheKey, {
          blob: rendered.blob,
          pageCount: pdf.numPages
        })
      }
      pages.push(rendered.page)
    }
    if (token !== loadToken || pdf !== pdfDocRef.value) return
    preview.value = {
      ...preview.value,
      type: 'pdf',
      pageCount: pdf.numPages,
      renderedPages: end,
      pages: [...(preview.value.pages || []), ...pages]
    }
  } finally {
    if (token === loadToken && pdf === pdfDocRef.value) {
      pdfRendering.value = false
    }
  }
}

function scheduleNextPdfPages(count = PDF_NEXT_PAGE_COUNT, token = loadToken) {
  if (scheduledPdfRender || pdfRendering.value) return
  const run = () => {
    scheduledPdfRender = null
    renderNextPdfPages(count, token).catch((error) => {
      if (preview.value.type !== 'pdf') return
      console.warn('[FileRichPreview] pdf render failed:', error)
      status.value = 'error'
      errorMessage.value = error?.message || 'PDF 后续页面加载失败'
    })
  }
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    scheduledPdfRender = {
      type: 'idle',
      id: window.requestIdleCallback(run, { timeout: 800 })
    }
  } else {
    scheduledPdfRender = {
      type: 'timeout',
      id: setTimeout(run, 0)
    }
  }
}

function normalizeModule(module) {
  return module.default || module
}

async function loadPdfJsModule() {
  const runtime = getPdfRuntimeCache()
  if (!runtime.modulePromise) {
    runtime.modulePromise = import('pdfjs-dist/es5/build/pdf.js').then((module) => {
      const pdfjs = normalizeModule(module)
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/es5/build/pdf.worker.js',
        import.meta.url
      ).toString()
      return pdfjs
    })
  }
  return runtime.modulePromise
}

async function loadPdf(file, token = loadToken) {
  const perf = createPdfPerfContext()
  file.__pdfPerf = perf
  activePdfCacheKey = getPdfFirstPageCacheKey(file)
  const cachedPage = getCachedPdfFirstPage(activePdfCacheKey)
  if (cachedPage) {
    preview.value = {
      type: 'pdf',
      pageCount: cachedPage.pageCount || 1,
      renderedPages: 1,
      pages: [createCachedPdfPage(cachedPage)]
    }
    status.value = 'ready'
    perf.backend = cachedPage.backend || 'cache'
    await nextTick()
  }
  let hasFastFirstPage = preview.value?.type === 'pdf' && preview.value.pages?.length
  if (!hasFastFirstPage) {
    await tryLoadPdfSharpFirstPage(file, activePdfCacheKey, token, perf)
    hasFastFirstPage = preview.value?.type === 'pdf' && preview.value.pages?.length
  }
  let pdf
  try {
    const pdfjs = await loadPdfJsModule()
    const readStartedAt = nowMs()
    const bytes = readBinaryFile(file.path)
    perf.readMs = nowMs() - readStartedAt
    pdf = await pdfjs.getDocument({ data: bytes, isEvalSupported: false }).promise
  } catch (error) {
    if (hasFastFirstPage) {
      perf.fallbackReason = perf.fallbackReason || error?.message || 'pdfjs-background-load-failed'
      debugPdfPerf(perf)
      return preview.value
    }
    throw error
  }
  if (token !== loadToken) {
    try {
      pdf.destroy?.()
    } catch (_) {}
    return { type: 'empty' }
  }
  pdfDocRef.value = pdf
  if (preview.value?.type === 'pdf' && preview.value.pages?.length) {
    preview.value = {
      ...preview.value,
      pageCount: pdf.numPages,
      renderedPages: Math.max(preview.value.renderedPages || 1, 1)
    }
    if (!perf.backend) perf.backend = hasFastFirstPage ? 'cache' : 'pdfjs'
    debugPdfPerf(perf)
    return preview.value
  }
  preview.value = {
    type: 'pdf',
    pageCount: pdf.numPages,
    renderedPages: 0,
    pages: []
  }
  await renderNextPdfPages(PDF_INITIAL_PAGE_COUNT, token)
  if (!perf.backend) perf.backend = 'pdfjs'
  if (!perf.firstPageMs) perf.firstPageMs = nowMs() - perf.startedAt
  debugPdfPerf(perf)
  return preview.value
}

async function loadPreview(file, token = loadToken) {
  if (file.kind === 'image') {
    return { type: 'image', src: getFileUrl(file.path) }
  }
  const size = getFileSize(file.path)
  const sizeState = getFileSizeState(size, file.kind)
  if (!sizeState.ok) {
    status.value = 'oversize'
    return { type: 'empty' }
  }
  const documentCacheKey = canCacheDocumentPreview(file) ? getDocumentPreviewCacheKey(file) : ''
  const cachedDocumentPreview = getCachedDocumentPreview(documentCacheKey)
  if (cachedDocumentPreview) return cachedDocumentPreview
  let result = { type: 'empty' }
  if (file.kind === 'text') {
    const { text } = await readTextFilePreview(file.path, {
      maxBytes: getTextPreviewByteLimit(file.kind)
    })
    result = { type: 'text', text: formatTextByFile(file.path, text) }
  } else if (file.kind === 'markdown') {
    result = await loadMarkdown(file)
  } else if (file.kind === 'asciidoc') {
    result = await loadAsciiDoc(file)
  } else if (file.kind === 'csv' || file.kind === 'spreadsheet') {
    result = await loadTable(file)
  } else if (file.kind === 'word') {
    result = await loadWord(file)
  } else if (file.kind === 'presentation') {
    result = await loadPresentation(file)
  } else if (file.kind === 'pdf') {
    result = await loadPdf(file, token)
  }
  if (documentCacheKey && result.type !== 'empty') {
    setCachedDocumentPreview(documentCacheKey, result)
  }
  return result
}

async function refreshPreview() {
  const file = activeFile.value
  const token = ++loadToken
  releasePdfDocument()
  preview.value = { type: 'empty' }
  errorMessage.value = ''
  if (!file) {
    status.value = 'idle'
    return
  }
  status.value = 'loading'
  try {
    const result = await loadPreview(file, token)
    if (token !== loadToken) return
    if (status.value !== 'oversize') status.value = 'ready'
    preview.value = result
    await nextTick()
    if (contentRef.value) {
      contentRef.value.scrollTop = 0
      contentRef.value.scrollLeft = 0
    }
  } catch (error) {
    if (token !== loadToken) return
    console.warn('[FileRichPreview] preview failed:', error)
    status.value = 'error'
    errorMessage.value = error?.message || '预览失败'
  }
}

function handleContentScroll() {
  const el = contentRef.value
  if (!el || preview.value.type !== 'pdf') return
  const nearBottom = el.scrollTop + el.clientHeight + 160 >= el.scrollHeight
  if (nearBottom) {
    scheduleNextPdfPages(PDF_NEXT_PAGE_COUNT, loadToken)
  }
}

function scrollByDelta(direction, delta) {
  const el = contentRef.value
  const axis = getPreviewScrollAxis(direction)
  if (!el || !axis || !delta) return false
  const key = axis === 'x' ? 'scrollLeft' : 'scrollTop'
  const maxKey = axis === 'x' ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight
  if (maxKey <= 0) return false
  const nextValue = Math.min(Math.max(0, el[key] + delta), maxKey)
  if (nextValue === el[key]) return false
  el[key] = nextValue
  return true
}

watch(
  () => activeFile.value?.path,
  () => refreshPreview(),
  { immediate: true }
)

onUnmounted(() => {
  loadToken += 1
  releasePdfDocument()
})

defineExpose({
  scrollByDelta,
  getScrollElement: () => contentRef.value
})
</script>

<style lang="less" scoped>
.file-rich-preview {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  color: var(--text-color);
}

.file-rich-preview__header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-elevated-color);
}

.file-rich-preview__badge {
  flex-shrink: 0;
  min-width: 42px;
  padding: 2px 7px;
  border: 1px solid color-mix(in srgb, var(--primary-color) 28%, transparent);
  border-radius: 6px;
  color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
  font-size: 11px;
  line-height: 1.3;
  text-align: center;
}

.file-rich-preview__name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: var(--text-color);
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-rich-preview__count {
  flex-shrink: 0;
  color: var(--text-color-lighter);
  font-size: 11px;
}

.file-rich-preview__content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 14px;
  background: var(--bg-color);
  box-sizing: border-box;
}

.file-rich-preview__empty,
.file-rich-preview__state {
  display: flex;
  min-height: 180px;
  align-items: center;
  justify-content: center;
  color: var(--text-color-lighter);
  font-size: 13px;
  text-align: center;
}

.file-rich-preview__text {
  margin: 0;
  color: var(--text-color);
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.file-rich-preview__html {
  color: var(--text-color);
  font-size: 13px;
  line-height: 1.65;
  word-break: break-word;

  :deep(h1),
  :deep(h2),
  :deep(h3) {
    margin: 0.8em 0 0.45em;
    line-height: 1.25;
  }

  :deep(p),
  :deep(ul),
  :deep(ol),
  :deep(pre),
  :deep(blockquote) {
    margin: 0 0 0.75em;
  }

  :deep(pre),
  :deep(code) {
    background: var(--text-bg-color);
    border-radius: 6px;
  }

  :deep(pre) {
    overflow: auto;
    padding: 10px;
  }
}

.file-rich-preview__table-wrap {
  min-width: max-content;
}

.file-rich-preview__sheet,
.file-rich-preview__note {
  margin-bottom: 8px;
  color: var(--text-color-lighter);
  font-size: 12px;
}

.file-rich-preview__table {
  border-collapse: collapse;
  color: var(--text-color);
  font-size: 12px;
  line-height: 1.4;

  td {
    max-width: 220px;
    min-width: 72px;
    padding: 6px 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-elevated-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.file-rich-preview__slides {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.file-rich-preview__slide {
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-elevated-color);
}

.file-rich-preview__slide-index {
  margin-bottom: 6px;
  color: var(--text-color-lighter);
  font-size: 11px;
  line-height: 1.3;
}

.file-rich-preview__slide-title {
  margin-bottom: 8px;
  color: var(--text-color);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  word-break: break-word;
}

.file-rich-preview__slide-text {
  margin: 0;
  padding-left: 18px;
  color: var(--text-color);
  font-size: 12px;
  line-height: 1.6;
  word-break: break-word;

  li + li {
    margin-top: 4px;
  }
}

.file-rich-preview__image {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}

.file-rich-preview__pdf {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.file-rich-preview__pdf-page {
  display: block;
  max-width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
}
</style>
