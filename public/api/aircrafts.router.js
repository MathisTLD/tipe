module.exports = {
  created() {
    this.router.get("/get", async (req, res) => {
      const aircrafts = await this.$app.calculator.fetchAircrafts();
      res.json(aircrafts);
    });
  }
};
