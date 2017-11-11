'use strict'

const test = require('ava')
const uuid = require('uuid-base62')
const r = require('rethinkdb')
const Db = require('../')
const utils = require('../lib/utils')
const fixtures = require('./fixtures')

test.beforeEach('configurar base de datos', async t => {
  const dbName = `senagram_${uuid.v4()}`
  const db = new Db({db: dbName})
  await db.connect()
  t.context.db = db
  t.context.dbName = dbName
  t.true(db.connected, 'esta conectado')
})

test.afterEach.always('desconectando y limpiando base de datos', async t => {
  let db = t.context.db
  let dbName = t.context.dbName

  await db.disconnect()
  t.false(db.connected, 'esta desconectado')

  let conn = await r.connect({})
  await r.dbDrop(dbName).run(conn)
})

test('guardar imagen', async t => {
  let db = t.context.db
  t.is(typeof db.guardarImagen, 'function', 'guardarImagen es una funcion')

  let imagen = fixtures.getImage()

  let created = await db.guardarImagen(imagen)
  t.is(created.description, imagen.description)
  t.is(created.url, imagen.url)
  t.is(created.likes, imagen.likes)
  t.is(created.liked, imagen.liked)
  t.deepEqual(created.tags, ['genial', 'tags', 'senagram'])
  t.is(created.userId, imagen.userId)
  t.is(typeof created.id, 'string')
  t.is(created.publicId, uuid.encode(created.id))
  t.truthy(created.createdAt)
})

test('like imagenes', async t => {
  let db = t.context.db
  t.is(typeof db.likeImagen, 'function', 'likeImagen es una funcion ')

  let imagen = fixtures.getImage()
  let created = await db.guardarImagen(imagen)
  let result = await db.likeImagen(created.publicId)
  t.true(result.liked)
  t.is(result.likes, imagen.likes + 1)
})

test('obtener imagen', async t => {
  let db = t.context.db
  t.is(typeof db.getImagen, 'function', 'getImage es una funcion')

  let imagen = fixtures.getImage()
  let created = await db.guardarImagen(imagen)
  let result = await db.getImagen(created.publicId)

  t.deepEqual(created, result)

  await t.throws(db.getImagen('equivoca'), /no encontrado/)
})

test('listar todas las imagenes', async t => {
  let db = t.context.db
  let imagenes = await fixtures.getImages()
  let guardarImagenes = imagenes.map(img => db.guardarImagen(img))
  let created = await Promise.all(guardarImagenes)
  let result = await db.getImagenes()

  t.is(created.length, result.length)
})

test('guardar usarios', async t => {
  let db = t.context.db

  t.is(typeof db.guardarUsuario, 'function', 'guardarUsuario es una funcion')

  let usuario = fixtures.getUser()
  let referenciaPassword = usuario.password
  let created = await db.guardarUsuario(usuario)

  t.is(usuario.username, created.username)
  t.is(usuario.email, created.email)
  t.is(usuario.name, created.name)
  t.is(utils.encryptar(referenciaPassword), created.password)
  t.is(typeof created.id, 'string')
  t.truthy(created.createdAt)
})

test('obtener usuario', async t => {
  let db = t.context.db

  t.is(typeof db.getUsuario, 'function', 'obtener usuario')

  let usuario = fixtures.getUser()
  let created = await db.guardarUsuario(usuario)
  let result = await db.getUsuario(usuario.username)

  t.deepEqual(created, result)

  await t.throws(db.getUsuario('jaa'), /no encontrado/)
})

test('autenticar usuario', async t => {
  let db = t.context.db

  t.is(typeof db.autenticar, 'function', 'autenticar es una funicion')

  let usuario = fixtures.getUser()
  let referenciaPassword = usuario.password
  await db.guardarUsuario(usuario)

  let exitoso = await db.autenticar(usuario.username, referenciaPassword)
  t.true(exitoso)

  let fallido = await db.autenticar(usuario.username, 'jaa')
  t.false(fallido)

  let falla = await db.autenticar('jaa', 'bar')
  t.false(falla)
})

test('listar fotos por usuario', async t => {
  let db = t.context.db

  t.is(typeof db.getImagenesPorUsuario, 'function', 'getImagenesPorUsuario es una funcion')

  let imagenes = fixtures.getImages(10)
  let userId = uuid.uuid()
  let random = Math.round(Math.random() * imagenes.length)

  let guardarImagenes = []
  for (let i = 0; i < imagenes.length; i++) {
    if (i < random) {
      imagenes[i].userId = userId
    }

    guardarImagenes.push(db.guardarImagen(imagenes[i]))
  }

  await Promise.all(guardarImagenes)

  let result = await db.getImagenesPorUsuario(userId)
  t.is(result.length, random)
})
