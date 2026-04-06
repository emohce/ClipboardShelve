const path = require('path')
const os = require('os')
const { existsSync, readFileSync, writeFileSync, mkdirSync, watch, copyFileSync } = require('fs')
const crypto = require('crypto')
const listener = require('./listener')
const { clipboard, nativeImage } = require('electron')
const time = require('./time')

const sep = path.sep

window.exports = {
  utools,
  path,
  os,
  existsSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  mkdirSync,
  watch,
  sep,
  crypto,
  listener,
  clipboard,
  nativeImage,
  time,
  Buffer
}
