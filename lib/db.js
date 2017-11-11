'use strict'

const r = require('rethinkdb')
const Promise = require('bluebird')
const utils = require('./utils')
const uuid = require('uuid-base62')

const defaults = {
  host: 'localhost',
  port: 28015,
  db: 'senagram'
}

class Db {
  constructor (options) {
    options = options || {}
    this.host = options.host || defaults.host
    this.port = options.port || defaults.port
    this.db = options.db || defaults.db
  }

  connect (callback) {
    this.connection = r.connect({ hots: this.host, port: this.port })

    this.connected = true

    let db = this.db
    let connection = this.connection

    let setup = async function () {
      let conn = await connection

      let dbList = await r.dbList().run(conn)
      if (dbList.indexOf(db) === -1) {
        await r.dbCreate(db).run(conn)
      }

      let dbTables = await r.db(db).tableList().run(conn)
      if (dbTables.indexOf('imagenes') === -1) {
        await r.db(db).tableCreate('imagenes').run(conn)
        await r.db(db).table('imagenes').indexCreate('createdAt').run(conn)
        await r.db(db).table('imagenes').indexCreate('userId', {multi: true}).run(conn)
      }

      if (dbTables.indexOf('usuarios') === -1) {
        await r.db(db).tableCreate('usuarios').run(conn)
        await r.db(db).table('usuarios').indexCreate('username').run(conn)
      }

      return conn
    }

    return Promise.resolve(setup()).asCallback(callback)
  }

  disconnect (callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado')).asCallback(callback)
    }
    this.connected = false
    return Promise.resolve(this.connection)
      .then((conn) => conn.close())
  }

  guardarImagen (imagen, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db

    let tasks = async function () {
      let conn = await connection
      imagen.createdAt = new Date()
      imagen.tags = utils.extractTags(imagen.description)

      let result = await r.db(db).table('imagenes').insert(imagen).run(conn)

      if (result.errors > 0) {
        return Promise.reject(new Error(result.first_error))
      }

      imagen.id = result.generated_keys[0]

      await r.db(db).table('imagenes').get(imagen.id).update({
        publicId: uuid.encode(imagen.id)
      }).run(conn)

      let created = await r.db(db).table('imagenes').get(imagen.id).run(conn)

      return Promise.resolve(created)
    }
    return Promise.resolve(tasks()).asCallback(callback)
  }

  likeImagen (id, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db
    let getImagen = this.getImagen.bind(this)

    let tasks = async function () {
      let conn = await connection

      let imagen = await getImagen(id)
      await r.db(db).table('imagenes').get(imagen.id).update({
        liked: true,
        likes: imagen.likes + 1
      }).run(conn)

      let created = await getImagen(id)
      return Promise.resolve(created)
    }
    return Promise.resolve(tasks()).asCallback(callback)
  }

  getImagen (id, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db
    let imagenId = uuid.decode(id)

    let tasks = async function () {
      let conn = await connection

      let imagen = await r.db(db).table('imagenes').get(imagenId).run(conn)

      if (!imagen) {
        return Promise.reject(new Error(`imagen ${imagenId} no encontrado`))
      }

      return Promise.resolve(imagen)
    }
    return Promise.resolve(tasks()).asCallback(callback)
  }

  getImagenes (id, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db

    let tasks = async function () {
      let conn = await connection

      let imagenes = await r.db(db).table('imagenes').orderBy({index: r.desc('createdAt')}).run(conn)

      let result = await imagenes.toArray()

      return Promise.resolve(result)
    }
    return Promise.resolve(tasks()).asCallback(callback)
  }

  guardarUsuario (usuario, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db

    let tasks = async function () {
      let conn = await connection

      usuario.password = utils.encryptar(usuario.password)
      usuario.createdAt = new Date()

      let result = await r.db(db).table('usuarios').insert(usuario).run(conn)

      if (result.errors > 0) {
        return Promise.reject(new Error(result.first_error))
      }

      usuario.id = result.generated_keys[0]

      let created = await r.db(db).table('usuarios').get(usuario.id).run(conn)

      return Promise.resolve(created)
    }
    return Promise.resolve(tasks()).asCallback(callback)
  }

  getUsuario (nombreusuario, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db

    let tasks = async function () {
      let conn = await connection

      await r.db(db).table('usuarios').indexWait().run(conn)
      let usuarios = await r.db(db).table('usuarios').getAll(nombreusuario, {
        index: 'username'}).run(conn)

      let result = null

      try {
        result = await usuarios.next()
      } catch (err) {
        return Promise.reject(new Error(`usuario ${nombreusuario} no encontrado`))
      }

      return Promise.resolve(result)
    }

    return Promise.resolve(tasks()).asCallback(callback)
  }

  autenticar (nombreusuario, password, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado')).asCallback(callback)
    }

    let getUsuario = this.getUsuario.bind(this)

    let tasks = async function () {
      let usuario = null
      try {
        usuario = await getUsuario(nombreusuario)
      } catch (err) {
        return Promise.resolve(false)
      }

      if (usuario.password === utils.encryptar(password)) {
        return Promise.resolve(true)
      }
      return Promise.resolve(false)
    }
    return Promise.resolve(tasks()).asCallback(callback)
  }

  getImagenesPorUsuario (userId, password, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db

    let tasks = async function () {
      let conn = await connection

      await r.db(db).table('imagenes').indexWait().run(conn)
      let imagenes = await r.db(db).table('imagenes').getAll(userId, {
        index: 'userId'
      }).orderBy(r.desc('createdAt')).run(conn)

      let result = await imagenes.toArray()

      return Promise.resolve(result)
    }
    return Promise.resolve(tasks()).asCallback(callback)
  }
}
module.exports = Db
