module.exports = {
  install() {},
  app: {
    created() {
      this.$addChildWithPath("weather", require("./component"));
    },
    async beforeMount() {
      await this.weather.$mount();
    },
  },
};
