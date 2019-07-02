const { readFileSync } = require('fs')
const {
  createHash,
  createSign,
  createHmac,
  createVerify
} = require('crypto')

const {
  PASSWORD,
  PASS_PHRASE,
  ORIGIN
} = process.env

const privateKey = readFileSync('./certs/private.pem')
const publicKey = readFileSync('./certs/private.pem')

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

  const publicKeyBuf = Buffer.from(publicKey).toString('ascii')
  const signatureBuf = new Buffer(output, 'base64') // Bug ??? with Buffer.from
  const result = verifier.verify({
    key: publicKeyBuf,
    passphrase: PASS_PHRASE
  }, signatureBuf)

  return result
}

function offsetUTC (offset = 0) {
  const date = new Date()
  const nowUTC = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours() + offset,
    date.getUTCMinutes(),
    date.getUTCSeconds()
  )
  return new Date(nowUTC)
}

async function generateParams (options) {
  // Determines which NemID flow to start
  const CLIENTFLOW = 'OCESLOGIN2'
  // The origin of the Service Provider site which will send parameters to the
  // NemID JS Client. The JS Client will abort with `APP001` or `APP007``
  // if a postMessage command is received from any other origin.
  const ORIGIN = Buffer.from(options.ORIGIN).toString('base64')

  // Trim certificate
  let ret = publicKey.toString().replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----/g, '')

  const SP_CERT = Buffer.from(ret).toString('base64')

  // Current time when generating parameters. The timestamp parameter
  // is converted to UTC and must match the NemID server time.
  // NemID accepts timestamps within the boundaries of 3 minutes.
  const TIMESTAMP = offsetUTC(2)


  // Base64 and SHA256 Encode it
  const params = `CLIENTFLOW${CLIENTFLOW}ORIGIN${ORIGIN}SP_CERT${SP_CERT}TIMESTAMP${TIMESTAMP}`

  const PARAMS_DIGEST = createHash('sha256')
    .update(params, 'utf8')
    .digest('base64')

  // Sign digest and Base64 encode
  const DIGEST_SIGNATURE = getSignature(PARAMS_DIGEST)

  console.log('IS VALID: ', verifyResult(PARAMS_DIGEST, DIGEST_SIGNATURE))

  let payload = {
    CLIENTFLOW,
    ORIGIN,
    SP_CERT,
    TIMESTAMP,
    PARAMS_DIGEST,
    DIGEST_SIGNATURE,
  }

  return payload
}


module.exports = async (req, res) => {
  res.setHeader('content-type', 'text/html')

  const TIMESTAMP = +new Date
  const params = await generateParams({ ORIGIN })

  return `<iframe
    id="nemid_iframe"
    allowfullscreen="true"
    scrolling="no"
    frameborder="0"
    style="width: 320px; height: 460px; outline: 1px dashed;"
    src="https://appletk.danid.dk/launcher/lmt/${TIMESTAMP}"
  ></iframe>

  <form method="post" action="#" id="postBackForm">
      <input type="hidden" name="response" value=""/>
  </form>

  <script>
    function onNemIDMessage (event) {
      if (event.origin !== 'https://appletk.danid.dk') return
      let postMessage = {}
      let message
      const frame = document.getElementById('nemid_iframe').contentWindow
      message = JSON.parse(event.data)
      console.log(JSON.stringify(message, null, 2))
      if (message.command === 'SendParameters') {
        postMessage.command = "parameters"
        postMessage.content = ${params}
        frame.postMessage(JSON.stringify(postMessage), 'https://appletk.danid.dk/launcher/std/${TIMESTAMP}')
      }

      if (message.command === 'changeResponseAndSubmit') {
        //document.getElementById('postBackForm').response.value = message.content
        // document.postBackForm.submit();
      }
    }
    if (window.addEventListener) {
      window.addEventListener('message', onNemIDMessage)
    } else if (window.attachEvent) {
      window.attachEvent('onmessage', onNemIDMessage)
    }
  </script>`
}
