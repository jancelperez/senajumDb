'use strict'

const crypto = require('crypto')

const utils = {
  extractTags,
  encryptar,
  normalizar
}

function extractTags (texto) {
  if (texto == null) return []
  let matches = texto.match(/#(\w+)/g)
  if (matches === null) return []
  matches = matches.map(normalizar)
  return matches
}

function normalizar (text) {
  text = text.toLowerCase()
  text = text.replace(/#/g, '')
  return text
}

function encryptar (password) {
  let shasum = crypto.createHash('sha256')
  shasum.update(password)
  return shasum.digest('hex')
}

module.exports = utils
