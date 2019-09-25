// Native
import { readFileSync } from 'fs'
import { join } from 'path'
import https from 'https'
import {
  createSign,
  createHash,
  createVerify
} from 'crypto'

// Packages
import fetch from 'node-fetch'
import express from 'express'

const app = express()
const { PASS_PHRASE, SERVICE_ID } = process.env
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
  const signatureBuf = Buffer.from(output).toString('base64')
  const result = verifier.verify({
    key: publicKeyBuf,
    passphrase: PASS_PHRASE
  }, signatureBuf)

  return result
}

async function generateParams (timestamp) {
  // Determines which NemID flow to start
  const CLIENTFLOW = 'OCESLOGIN2'
  // The origin of the Service Provider site which will send parameters to the
  // NemID JS Client. The JS Client will abort with `APP001` or `APP007``
  // if a postMessage command is received from any other origin.
  const ORIGIN = 'http://localhost:3000'
  const REMEMBER_USERID = 'true'
  const DO_NOT_SHOW_CANCEL = 'true'

  const SP_CERT = Buffer.from(publicKey).toString('base64')

  // Current time when generating parameters. The timestamp parameter
  // is converted to UTC and must match the NemID server time.
  // NemID accepts timestamps within the boundaries of 3 minutes.
  const TIMESTAMP = Buffer.from(timestamp.toString()).toString('base64')


  // Base64 and SHA256 Encode it
  const params = `CLIENTFLOW${CLIENTFLOW}DO_NOT_SHOW_CANCEL${DO_NOT_SHOW_CANCEL}ORIGIN${ORIGIN}REMEMBER_USERID${REMEMBER_USERID}SP_CERT${SP_CERT}TIMESTAMP${TIMESTAMP}`

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
    REMEMBER_USERID,
    DO_NOT_SHOW_CANCEL,
    DIGEST_SIGNATURE,
  }
  // console.log(JSON.stringify(payload))
  return payload
}

app.get('/test/:timestamp', async (req, res) => {
  const { timestamp } = req.params
  const params = await generateParams(timestamp)
  // console.log(params)
  res.status(200).json(params)
})

app.get('/extract', async (req, res) => {
  res.setHeader('content-type', 'application/xml')
  const xmlPath = join(__dirname, 'certs')
  const xml = readFileSync(xmlPath + '/response.xml')

  res.status(200).send(xml)
})

app.get('/nets/spid', async (req, res) => {
  // const body = await req.body
  // console.log({body})
  const agent = new https.Agent({
    key: privateKey,
    cert: publicKey,
    passphrase: PASS_PHRASE
  })

  // const payload = `<?xml version="1.0" encoding="iso-8859-1"?>`
  const payload= `<?xml version="1.0" encoding="iso-8859-1"?>
  <method name="pidCprRequest" version="1.0">
  <request><serviceId>${SERVICE_ID}</serviceId><pid>9208-2002-2-110681187784</pid><cpr>2508163507</cpr></request>
  </method>`
  // https://www.ident-preprod1.nets.eu/its/index.html?client_id=
    try {
      const x = await fetch('https://pidws.pp.certifikat.dk/pid_serviceprovider_server/pidxml/', {
      method: 'post',
      agent,
      headers: { 'content-type': 'application/xml' },
      body: payload
    })
    console.log('status ', x.status)
    console.log('response ', await x.text())
    // const status = await x.text()
    res.status(x.status).send('ok')
    } catch (error) {
      console.error(error)
      res.status(500).send('error')
    }
})

export default app
