const bodyparser = require("body-parser");

module.exports = {
  created() {
    this.router.get("/test", (req, res) => {
      this.$app.calculator
        .createCalculation()
        .run()
        .then((results) => res.json(results))
        .catch(() => res.sendStatus(400));
    });
    this.router.get("/heuristic-tests", bodyparser.json(), (req, res) => {
      this.$app.calculator
        .getHeuristicTestResults()
        .then((results) => res.json(results))
        .catch(() => res.sendStatus(500));
    });
    this.router.post("/run", bodyparser.json(), (req, res) => {
      const opts = req.body;
      this.$app.calculator
        .createCalculation(opts)
        .run()
        .then((results) => res.json(results))
        .catch(() => res.sendStatus(400));
    });
  },
};
