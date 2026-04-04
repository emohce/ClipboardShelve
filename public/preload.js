const { existsSync, readFileSync, writeFileSync, mkdirSync, watch, copyFileSync } = require('fs')
const { sep } = require('path')
const crypto = require('crypto')
const listener = require('./listener')
const { clipboard, nativeImage } = require('electron')
const time = require('./time')

window.exports = {
  utools,
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
