import bodyParser from 'body-parser'

const { API } = process.env

export default {
  env: {
    API
  },
  build: {
    hardSource: true
  },
  serverMiddleware: [
    bodyParser.json(),
    '~/api/index'
  ]
}
