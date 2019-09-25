<template>
  <div v-if="content">
    <iframe
      id="nemid_iframe"
      allowfullscreen="true"
      scrolling="no"
      frameborder="0"
      :style="style"
      :src="originUrl"
    />

    <form method="post" action="#" name="postBackForm">
      <input type="hidden" name="response" value="">
    </form>

    <script
      id="nemid_parameters"
      type="text/x-nemid"
    >
      {{ content }}
    </script>
  </div>
</template>

<script>
export default {
  data: () => ({
    origin: 'https://appletk.danid.dk',
    style: { width: '200px', height:'250px' },
    content: null
  }),


  computed: {
    uuidv4 () {
      return +new Date
    },
    originUrl () {
      return this.origin + '/launcher/std/' + this.uuidv4
    }
  },

  async mounted() {
    await this.getContent()

    if (window.addEventListener) {
      window.addEventListener('message', this.onNemIDMessage)
    } else if (window.attachEvent) {
      window.attachEvent('onmessage', this.onNemIDMessage)
    }
  },

  methods: {
      // this.$nextTick(() => {
    async onNemIDMessage (event) {
      if (event.origin !== this.origin) return
      const frame = document.getElementById('nemid_iframe').contentWindow
      let postMessage = {}
      let message
      message = JSON.parse(event.data)
      // console.log(JSON.stringify(message)) // eslint-disable-line
      if (message.command === 'SendParameters') {
        const htmlParameters = document.getElementById("nemid_parameters").innerHTML
        postMessage.command = 'parameters'
        postMessage.content = htmlParameters
        // console.log('SendParameters', JSON.stringify(postMessage)) // eslint-disable-line
        frame.postMessage(JSON.stringify(postMessage), this.originUrl) // std | lmt
      }

      if (message.command === 'changeResponseAndSubmit') {
        try {
          const msg = window.atob(message.content)
          if (msg.startsWith('<?xml')) {
            console.log('ITS A CERT', msg) // eslint-disable-line
            const payload = {
              cert: msg
            }
            const x  = await (await fetch(`http://localhost:3000/nets/spid`, {
              method: 'post',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(payload)
            })).json()
            console.log('NETS SPID', x) // eslint-disable-line
          } else {
            console.log('changeResponseAndSubmit ', msg) // eslint-disable-line
          }

        } catch (error) {
          // something failed
          console.error('changeResponseAndSubmit ', error)  // eslint-disable-line
          // if you want to be specific and only catch the error which means
          // the base 64 was invalid, then check for 'e.code === 5'.
          // (because 'DOMException.INVALID_CHARACTER_ERR === 5')
        }
        document.postBackForm.response.value = message.content
      }
    },
    async getContent () {
      try {
        const x  = await fetch('http://localhost:3000/test/' + this.uuidv4)
        this.content = await x.json()
      } catch (error) {
        console.error('getIframe: ', error) // eslint-disable-line
      }
    }
  }
}
</script>
