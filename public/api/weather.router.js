module.exports = {
  created() {
    this.router.get("/wind.json", (req, res) => {
      this.$app.weather
        .getLiveWind()
        .then((json) => {
          res.json(json);
        })
        .catch((err) => {
          this.logger.error(err);
          res.sendStatus(500);
        });
    });
  },
};
