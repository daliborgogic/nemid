<template>
  <div>
    <iframe
      id="nemid_iframe"
      allowfullscreen="true"
      scrolling="no"
      frameborder="0"
      style="width: 250px; height: 250px"
      :src="'https://appletk.danid.dk/launcher/lmt/' + timestamp"
    />

    <form method="post" action="#" name="postBackForm">
      <input type="hidden" name="response" value=""/>
    </form>

    <pre>{{ JSON.stringify(params, null, 2) }}</pre>

    <pre>{{ timestamp }} {{ y }}</pre>
  </div>
</template>

<script>
export default {
  async asyncData ({ env }) {
    const timestamp = +new Date
    const payload = {
      origin: 'http://localhost:3000',
      timestamp
    }
    const x = await fetch('http://localhost:3000/test', {
      method: 'post',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    const y = await x.json()
    return {
      timestamp,
      y
    }
  },

  data: () => ({
    params: null
  }),
  mounted () {
    function onNemIDMessage (event) {
        if (event.origin !== 'https://appletk.danid.dk') return
        let postMessage = {}
        let message
        const frame = document.getElementById('nemid_iframe').contentWindow
        message = JSON.parse(event.data)
        this.params = message
        console.log(JSON.stringify(message, null, 2))
        if (message.command === 'SendParameters') {
          // const htmlParameters = document.getElementById("nemid_parameters").innerHTML
          postMessage.command = "parameters"
          postMessage.content = this.params
          frame.postMessage(JSON.stringify(postMessage), `https://appletk.danid.dk/launcher/std/${this.timestamp}`)
        }
        if (message.command === 'changeResponseAndSubmit') {
          document.postBackForm.response.value = message.content
          // document.postBackForm.submit()
        }
      }
      if (window.addEventListener) {
        window.addEventListener('message', onNemIDMessage)
      } else if (window.attachEvent) {
        window.attachEvent('onmessage', onNemIDMessage)
      }
  }
}
</script>

<style>

</style>
