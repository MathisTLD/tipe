module.exports = {
  install() {},
  app: {
    created() {
      this.$addChildWithPath("calculator", require("./component"));
    },
    async beforeMount() {
      await this.calculator.$mount();
    },
  },
};
