import bodyParser from 'body-parser'
export default {
  build: {
    hardSource: true
  },
  serverMiddleware: [
    bodyParser.json(),
    '~/api/index'
  ]
}
