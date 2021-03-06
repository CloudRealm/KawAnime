export default {
  computed: {
    userConfig: {
      get () {
        return this.$store.state.config.config.video
      },
      set () {}
    }
  },

  methods: {
    triggerConfigActions () {
      if (this.userConfig.autoplay) this.mpv.property('pause', false)
      if (this.userConfig.fullscreen) this.$nextTick(this.toggleFullScreen)
    }
  }
}
