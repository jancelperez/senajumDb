'use strict'

const test = require('ava')
const utils = require('../lib/utils')

test('extrallendo hashtags de text', t => {
  let tags = utils.extractTags('a #imagenes con tags #AwEsOmE #Sena #AVA and # #100 ##yes')

  t.deepEqual(tags, [
    'imagenes',
    'awesome',
    'sena',
    'ava',
    '100',
    'yes'
  ])

  tags = utils.extractTags('imagenes sin tags')
  t.deepEqual(tags, [])

  tags = utils.extractTags()
  t.deepEqual(tags, [])

  tags = utils.extractTags(null)
  t.deepEqual(tags, [])
})

test('encriptar contraseña', t => {
  let password = 'foo123'
  let encrypted = '02b353bf5358995bc7d193ed1ce9c2eaec2b694b21d2f96232c9d6a0832121d1'
  let result = utils.encryptar(password)

  t.is(result, encrypted)
})
