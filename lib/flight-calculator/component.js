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
    return await new Promise((resolve, reject) => {
      const proc = spawn(this.exe, [
        Calculation.stringifyOptions(this.options),
        "-v",
      ]);
      let ev = null;
      let results = null;
      proc.stdout.on("data", (data) => {
        data
          .toString()
          .trim()
          .split("\n")
          .forEach((line) => {
            if (/^---/.test(line)) {
              if (!ev) ev = { name: line.substring(3), payload: "" };
              else {
                logger.verbose(
                  `calculation [${this.uid}]: got event ${ev.name} (${(
                    Buffer.byteLength(ev.payload, "utf8") / 1000
                  ).toFixed(2)}kb)`
                );
                if (ev.name === "results") {
                  results = JSON.parse(ev.payload);
                }
              }
            } else {
              if (ev) ev.payload += line;
              else logger.verbose(`calculation [${this.uid}]: ${line}`);
            }
          });
      });
      let errors = [];
      proc.stderr.on("data", (data) => {
        logger.error(`calculation [${this.uid}]: \n${data}`);
        errors.push[data.toString()];
      });

      proc.on("close", (code) => {
        logger.verbose(`calculation [${this.uid}]: exited with code ${code}`);
        if (code === 0) {
          if (!results)
            reject(new Error("Process exited with code 0 gave no results"));
          else resolve(results);
        } else reject(errors);
      });
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
      directions: 3,
    };
    ["precision", "directions"].forEach((key) => {
      if (key in opts) {
        const val = opts[key];
        // TODO: add type check
        options[key] = val;
      }
    });
    ["departure", "arrival"].forEach((key) => {
      if (key in opts) {
        const loc = opts[key];
        const { lat, lon } = loc;
        // TODO: add type check
        options[key] = { lat, lon };
      }
    });
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
        .then((res) => {
          console.log(res);
        })
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
