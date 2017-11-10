'use strict'

const uuid = require('uuid-base62')

const fixtures = {
  getImage () {
    return {
      description: 'una foto #genial con #tags #senagram',
      url: `https://senagram.test/${uuid.v4()}.jpg`,
      likes: 0,
      liked: false,
      user_id: uuid.uuid()
    }
  },
  getImages (n) {
    let images = []
    while (n-- > 0) {
      images.push(this.getImage())
    }
    return images
  },
  getUser () {
    return {
      name: 'nombre aleatorio',
      username: `user_${uuid.v4}`,
      password: uuid.uuid(),
      email: `${uuid.v4()}@senagram.test`
    }
  }
}

module.exports = fixtures
