module.exports = {
  created() {
    this.router.get("/test", (req, res) => {
      this.$app.calculator.test();
      res.sendStatus(200);
    });
  },
};
