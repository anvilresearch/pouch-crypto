/**
 * Dependencies
 */
const PouchDB = require('pouchdb')
const { JWT, JWD } = require('@trust/jose')

/**
 * PouchDB Plugins
 */
PouchDB.plugin(require('pouchdb-find'))

/**
 * Constants
 */
const DATABASE = Symbol()

/**
 * PouchCrypto
 */
class PouchCrypto extends JWD {

  /**
   * set database
   *
   * @description
   * Configure the database
   *
   * @param {(Object|string)} options – PouchDB options
   */
  static set database (options) {
    return this[DATABASE] = new PouchDB(options)
  }

  /**
   * get database
   *
   * @description
   * Reference the configured database
   *
   * @returns {PouchDB}
   */
  static get database () {
    let db = this[DATABASE]

    if (!db) {
      throw new Error(`Database must be configured for "${this.name}" class`)
    }

    return db
  }

  /**
   * find
   *
   * @description
   * Query a database and return instances of the class for
   * each document found.
   *
   * @param {Object} options – CouchDB mango query
   * @returns {Promise}
   */
  static find (options = {}) {
    let Extended = this

    options.selector = options.selector || {}

    return this.database.find(options)
      .then(results => results.docs.map(doc => new Extended(doc)))
  }

  /**
   * get
   *
   * @description
   * Retrieves a stored document and instantiate the extending class
   *
   * @param {string} id – Document identifier
   * @returns {Promise}
   */
  static get (id) {
    let Extended = this

    return this.database.get(id)

      // instantiate the result
      .then(doc => {
        return new Extended(doc)
      })

      // unknown documents are null
      .catch(err => {
        let { status, message } = err

        if (status === 404) {
          return null
        }

        throw new Error(message)
      })
  }

  /**
   * post
   *
   * @description
   * Create a new document and provide an instance of the extending class.
   *
   * @param {Object} data – document to be stored.
   * @returns {Promise}
   */
  static post (data) {
    let Extended = this

    // VALIDATE

    return this.database.post(data)
      .then(result => {
        // TODO
        // JOSE should not drop these such that they need to be reassigned.
        // Should possibly be an option, like "clean", defaulting to false?
        return new Extended(Object.assign({
          _id: result.id,
          _rev: result.rev
        }, data))
      })
  }

  /**
   * put
   *
   * @description
   * Create a new document or update an existing one and provide an instance
   * of the extending class.
   *
   * @param {Object} data – document to be stored.
   * @returns {Promise}
   */
  static put (update) {
    let Extended = this
    let { database } = this

    return Promise.resolve()

      // get an existing document
      .then(() => database.get(update._id))

      // ensure latest revision
      .then(doc => {
        if (doc !== null) {
          update['_rev'] = doc['_rev']
        }

        return database.put(update)
      })

      // set new revision
      .then(result => {
        update['_rev'] = result.rev

        if (!(update instanceof Extended)) {
          update = new Extended(update)
        }

        return update
      })
  }

  /**
   * remove
   *
   * @description
   * Remove a document from the database.
   *
   * @param {string} id – identifier of document to be deleted.
   * @returns {Promise}
   */
 static remove (id) {
    let { database } = this

    return Promise.resolve()
      .then(() => database.get(id))
      .then(doc => database.remove(doc))
      .then(result => !!result.ok)
      .catch(err => {
        let { status, message } = err

        if (status === 404) {
          return false
        }

        // TODO
        // make our own custom error type here
        throw new Error(message)
      })
  }

  /**
   * createIndex
   *
   * @description
   * Create an index in the database.
   *
   * @param {Object} index – description of index
   * @returns {Promise}
   */
  static createIndex (index) {
    return this.database.createIndex(index)
  }

  /**
   * put
   *
   * @description
   * Update the instance in database.
   *
   * @returns {Promise}
   */
  put () {
    let database = this.database
    let validation = this.validate()

    if (!validation.valid) {
      return Promise.reject(validation)
    }

    return database.put()

  }

  /**
   * remove
   */
  remove () {
    return this.constructor.remove(this)
  }

}

/**
 * Export
 */
module.exports = PouchCrypto
