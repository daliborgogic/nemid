// Native
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  createSign,
  createHash,
  createVerify
} from 'crypto'

// Packages
import express from 'express'

const app = express()
const { PASS_PHRASE } = process.env
const certPath = join(__dirname, 'certs')
const privateKey = readFileSync(certPath + '/private.pem')
const publicKey = readFileSync(certPath + '/public.pem')

const getSignature = input => {
  const sign = createSign('RSA-SHA256')

  sign.update(input)

  const signature = sign.sign({
    key: privateKey,
    passphrase: PASS_PHRASE
  }, 'base64')

  return signature
}

const verifyResult = (input, output) => {
  const verifier = createVerify('RSA-SHA256')

  verifier.update(input)

  const publicKeyBuf = Buffer.from(publicKey).toString() // 'ascii'
  const signatureBuf = new Buffer(output, 'base64') // Bug ??? with Buffer.from
  const result = verifier.verify({
    key: publicKeyBuf,
    passphrase: PASS_PHRASE
  }, signatureBuf)

  return result
}

async function generateParams (options) {
  // Determines which NemID flow to start
  const CLIENTFLOW = 'OCESLOGIN2'
  // The origin of the Service Provider site which will send parameters to the
  // NemID JS Client. The JS Client will abort with `APP001` or `APP007``
  // if a postMessage command is received from any other origin.
  const ORIGIN = Buffer.from(options.origin).toString('base64')

  const SP_CERT = Buffer.from(publicKey).toString('base64')

  // Current time when generating parameters. The timestamp parameter
  // is converted to UTC and must match the NemID server time.
  // NemID accepts timestamps within the boundaries of 3 minutes.
  const TIMESTAMP = Buffer.from(options.timestamp.toString()).toString('base64')


  // Base64 and SHA256 Encode it
  const params = `CLIENTFLOW${CLIENTFLOW}ORIGIN${ORIGIN}SP_CERT${SP_CERT}TIMESTAMP${TIMESTAMP}`

  const PARAMS_DIGEST = createHash('sha256')
    .update(params, 'utf8')
    .digest('base64')

  // Sign digest and Base64 encode
  const DIGEST_SIGNATURE = getSignature(params)

  console.log('IS VALID: ', verifyResult(params, DIGEST_SIGNATURE))

  const payload = {
    CLIENTFLOW,
    ORIGIN,
    SP_CERT,
    TIMESTAMP,
    PARAMS_DIGEST,
    DIGEST_SIGNATURE,
  }
  return payload
}

app.post('/test', async (req, res) => {
  const { origin, timestamp } = await req.body
  const params = await generateParams({ origin, timestamp })
  // console.log(params)
  res.json(params)
})

export default app
