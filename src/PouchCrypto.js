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
    this[DATABASE] = new PouchDB(options)
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
    return this[DATABASE]
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
  static find (options) {
    let Extended = this

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
      .then(doc => new Extended(doc))
      .catch(err => {
        if (err.status === 404) {
          return null
        }

        throw err
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
  static put (doc) {
    return this.database.put(doc)
      .then(data => {
        doc['_rev'] = data.rev
        return doc
      })
  }

  /**
   * save
   *
   * @description
   *
   * @param {} name – desc
   * @returns {}
   */
  static save (doc) {
    if (!doc['_rev']) {
      return this.post(doc)
    }

    return this.put(doc)
  }

  /**
   * name
   *
   * @description
   *
   * @param {} name – desc
   * @returns {}
   */
  static patch (doc, ops) {
    doc.patch(ops)
    return doc.save()
  }

  /**
   * diff
   *
   * @description
   *
   * @param {} name – desc
   * @returns {}
   */
  static diff () {}

  /**
   * name
   *
   * @description
   *
   * @param {} name – desc
   * @returns {}
   */
 static remove (id) {
    let { database } = this

    return Promise.resolve()
      .then(() => database.get(id))
      .then(doc => database.remove(doc))
      .then(result => !!result.ok)
      .catch(err => {
        if (err.status === 404) {
          return false
        }

        throw err
      })
  }

  /**
   * name
   *
   * @description
   *
   * @param {} name – desc
   * @returns {}
   */
  static createIndex (index) {
    return this.database.createIndex(index)
  }

  /**
   * save
   *
   * @description
   *
   * @param {} name – desc
   * @returns {}
   */
  save () {
    return this.constructor.database.save(this)
  }

}

/**
 * Export
 */
module.exports = PouchCrypto
