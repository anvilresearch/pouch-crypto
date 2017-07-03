/**
 * Dependencies
 */
const crypto = require('@trust/webcrypto')
const PouchCrypto = require('../src')

/**
 * Contract
 */
class Contract extends PouchCrypto {

  /**
   * execute
   *
   * @description
   * Sign the latest version of the document, save it,
   * and resolve a promise with the updated doc
   */
  static execute (options) {
    let { id, signatures } = options

    return Contract.get(id).then(doc => {
      return Promise.resolve()
        .then(() => doc.sign({ signatures, result: 'instance' }))
        .then(() => doc.save())
        .catch(err => console.log(err))
    })
  }

}

/**
 *
 * 1. generate keys
 * 2. post a contract
 * 3. execute the contract
 * 4. fetch and verify the contract
 */
let publicKey, privateKey

Contract.database = 'data/contracts'

crypto.subtle.generateKey(
  {
    name: 'ECDSA',
    namedCurve: 'K-256',
    hash: { name: 'SHA-256' }
  },
  true,
  [
    'sign',
    'verify'
  ]
)
.then(keypair => {
  publicKey = keypair.publicKey
  privateKey = keypair.privateKey
})

.then(() => Contract.createIndex({
  index: {
    fields: ['payload.foo']
  }
}))

.then(() => {
  return Contract.post({ payload: { foo: 'bar' } })
})

.then(doc => {
  return doc.sign({
    signatures: [
      { protected: { alg: 'KS256' }, cryptoKey: privateKey }
    ],
    result: 'instance'
  })
  .then(str => {
    let jwd = JSON.parse(str)
    doc.signatures = jwd.signatures
    return doc
  })
})

.then(doc => Contract.put(doc))
.then(doc => Contract.get(doc._id))
//.then(() => Contract.find({ selector: { 'payload.foo': 'bar' } }))
//.then(docs => Contract.save(docs.pop()))
//.then(doc => Contract.remove(doc))

//.then(doc => doc.save())
//.then(result => console.log(JSON.stringify(result)))
.then(console.log)
.catch(console.log)
