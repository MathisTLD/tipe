/* component */
const path = require("path");
const { spawn } = require("child_process");

const { logger } = require("campbell");

let uid = 0;
class Calculation {
  constructor(app, options) {
    this.uid = uid++;
    this.app = app;
    this.options = Calculation.normalizeOptions(options);

    this.exe = path.resolve(this.app.$config.rootDir, "calculator");
  }
  async run() {
    // FIXME: should be in dev mode only and wont work if source code not in .. relative to rrot dir
    await require("./compile")(
      path.dirname(this.exe),
      path.resolve(
        this.app.$config.rootDir,
        "../lib/flight-calculator/calculator"
      )
    );
    const proc = spawn(this.exe, [
      Calculation.stringifyOptions(this.options),
      "-v",
    ]);
    proc.stdout.on("data", (data) => {
      logger.verbose(`calculation [${this.uid}]: ---\n${data}---`);
    });
    proc.stderr.on("data", (data) => {
      logger.error(`calculation [${this.uid}]: ---\n${data}\n---`);
    });

    proc.on("close", (code) => {
      logger.verbose(`calculation [${this.uid}]: exited with code ${code}`);
    });
  }
  static normalizeOptions(opts = {}) {
    const options = {
      // Paris
      departure: {
        lat: 48.856614,
        lon: 2.3522219,
      },
      // NYC
      arrival: {
        lat: 40.7127753,
        lon: -74.0059728,
      },
      precision: 400,
    };
    if ("precision" in opts) {
      options.precision = opts.precision;
    }
    // TODO: do the rest
    return options;
  }
  static stringifyOptions(opts = {}) {
    const options = this.normalizeOptions(opts);
    return JSON.stringify(options, 2);
  }
}

module.exports = {
  methods: {
    test() {
      this.createCalculation()
        .run()
        .catch((err) => {
          logger.error("Error running calculation:\n" + err);
        });
    },
    createCalculation(options) {
      const calculation = new Calculation(this.$app, options);
      return calculation;
    },
  },
};