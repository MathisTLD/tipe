/* component */
const path = require("path");
const fs = require("fs-extra");
const { spawn } = require("child_process");

const { logger } = require("campbell");

const axios = require("axios");
const { JSDOM } = require("jsdom");

let uid = 0;
class Calculation {
  constructor(app, options) {
    this.uid = uid++;
    this.app = app;
    this.options = Calculation.normalizeOptions(options);

    this.exe = path.resolve(this.app.$config.rootDir, "bin", "calculator");
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
        "-v"
      ]);
      let ev = null;
      let results = null;
      proc.stdout.on("data", data => {
        data
          .toString()
          .trim()
          .split("\n")
          .forEach(line => {
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
      proc.stderr.on("data", data => {
        logger.error(`calculation [${this.uid}]: \n${data}`);
        errors.push[data.toString()];
      });

      proc.on("close", code => {
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
        alt: 0
      },
      // NYC
      arrival: {
        lat: 40.7127753,
        lon: -74.0059728,
        alt: 0
      },
      precision: 100,
      directions: 1
    };
    ["precision", "directions"].forEach(key => {
      if (key in opts) {
        const val = opts[key];
        // TODO: add type check
        options[key] = val;
      }
    });
    ["departure", "arrival"].forEach(key => {
      if (key in opts) {
        const loc = opts[key];
        const { lat, lon } = loc;
        // TODO: add type check
        options[key] = { lat, lon, alt: 0 };
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
  created() {
    this.aircrafts = {};
    this.$hooks["start:before"].tapPromise("LoadAircrafts", async () => {
      await this.loadAircrafts();
      await this.fetchAircrafts();
    });
  },
  methods: {
    createCalculation(options) {
      const calculation = new Calculation(this.$app, options);
      return calculation;
    },
    parseAircraft(file) {
      // files fetches from : https://www.littlenavmap.org/downloads/Aircraft%20Performance/X-Plane/
      // described here : https://github.com/albar965/littlenavmap-manual/blob/master/en/AIRCRAFTPERFEDIT.md
      const lines = file.split("\n").map(l => l.trim());
      const aircraft = {};
      let section = "";
      let fuelAsVolume = null;
      const createError = err =>
        new TypeError(
          `InvalidFile: ${err} ${
            aircraft.Options ? `(at ${aircraft.Options.name})` : ""
          }`
        );
      const toCamelCase = pascalStr =>
        pascalStr.charAt(0).toLowerCase() + pascalStr.slice(1);
      for (let line of lines) {
        if (/^\[.*\]$/.test(line)) {
          section = line.slice(1, line.length - 1);
          if (section === "Perf") {
            // fuelAsVolume has been defined
            if (fuelAsVolume == null) throw new TypeError("didn't provided");
            aircraft.performances = {};
          }
        } else {
          const [key, val] = line.split("=").map(str => str.trim());
          if (!key) continue;
          if (section === "Options") {
            switch (key) {
              case "FuelAsVolume":
                fuelAsVolume =
                  val === "true" ? true : val === "false" ? false : null;
                break;
              case "JetFuel":
                aircraft.fuelType = val === "true" ? "jetfuel" : "avgas";
                break;
              case "Name":
                aircraft.name = (val || "").replace(/(^\W*|\W*$)/g, ""); // sanitize name
                if (!aircraft.name)
                  throw createError("name should not be empty");
                break;
              case "Description":
                aircraft.description = val || "";
                break;
              case "AircraftType":
                aircraft.type = val || "";
                break;
              default:
            }
          } else if (section === "Perf") {
            const perf = aircraft.performances;
            let x = Number(val);
            const convert = unit => {
              const toM3 = () => {
                // ensure x is a volume
                if (!fuelAsVolume) {
                  // x is in lbs
                  x *= 0.453592; // switch to kg
                  x *= aircraft.fuelType === "jetfuel" ? 800 : 721; // switch to m3 density in kg/M3 taken from https://en.wikipedia.org/wiki/Jet_fuel and https://fr.wikipedia.org/wiki/Avgas
                } else {
                  // x is in gal
                  x *= 0.00378541; // switch to m3
                }
              };
              switch (unit) {
                case "Kts":
                  x *= 0.514444; // to m/s
                  break;
                case "LbsGalPerHour":
                  toM3(); // switch to m3/h
                  x /= 3600.0; // switch to m3/s
                  break;
                case "LbsGal":
                  toM3();
                  break;
                case "FtPerMin":
                  x *= 0.00508; // to m/s
                  break;
                default:
                  throw createError(`unknown unit ${unit} for prop ${key}`);
              }
            };
            const [phase] = (
              key.match(/^(Climb|Cruise|Descent)/) || []
            ).map(str => str.toLowerCase()); // handle when null
            if (phase) {
              if (!perf[phase]) {
                perf[phase] = {};
              }
              let prop = key.slice(phase.length);
              let unit = "";
              if (/Speed.*TAS$/.test(prop)) {
                unit = prop.replace(/^Speed/, "").replace(/TAS$/, "");
                prop = "speed";
              } else {
                const [_prop] = prop.match(/^(VertSpeed|FuelFlow)/) || [];
                if (_prop) {
                  unit = prop.slice(_prop.length);
                  prop = _prop;
                } else continue;
              }
              convert(unit); // modifies x to International System corresponding unit
              perf[phase][toCamelCase(prop)] = x;
            }
            // else ignore props
          }
        }
      }
      const checkVal = (path, type) => {
        let val = aircraft;
        try {
          for (let key of path) {
            val = val[key];
          }
        } catch (e) {
          throw new Error(`no value at path ${path.join(".")}`);
        }
        if (typeof val !== type)
          throw new Error(`${path.join(".")} should be of type ${type}`);
      };
      if (!section) throw new Error("Unsupported file format");
      ["name", "description", "type", "fuelType"].forEach(key =>
        checkVal([key], "string")
      );
      [
        ...["climb", "cruise", "descent"]
          .map(key => [
            [key, "speed"],
            [key, "fuelFlow"]
          ])
          .flat(),
        ...["climb", "descent"].map(key => [key, "vertSpeed"])
      ].map(path => checkVal(["performances", ...path], "number"));

      return aircraft;
    },
    async loadAircrafts() {
      const aircraftsPath = this.$app.resolvePath("#data/aircrafts.json");
      if (!(await fs.pathExists(aircraftsPath))) await this.saveAircrafts();
      Object.assign(this.aircrafts, await fs.readJson(aircraftsPath));
    },
    async saveAircrafts() {
      const aircraftsPath = this.$app.resolvePath("#data/aircrafts.json");
      await fs.outputJson(aircraftsPath, this.aircrafts, {
        spaces: 2
      });
    },
    async fetchAircrafts() {
      const aircrafts = this.aircrafts;
      const getLinks = url =>
        axios
          .get(url, {
            baseURL: "https://www.littlenavmap.org/"
          })
          .then(res => {
            const dom = new JSDOM(res.data);
            const links = [
              ...dom.window.document.querySelectorAll("tr > td > a")
            ]
              .filter(link => link.textContent !== "Parent Directory")
              .map(link => res.request.path + link.href);
            return links;
          });
      const links = await getLinks("/downloads/Aircraft Performance/")
        .then(links =>
          Promise.all(links.map(link => getLinks(link))).then(l => l.flat())
        )
        .then(links =>
          links
            .filter(link => /\.lnmperf$/.test(link))
            .map(link => "https://www.littlenavmap.org" + link)
        );
      await Promise.all(
        links.map(link =>
          axios.get(link, { responseType: "text" }).then(res => {
            try {
              const aircraft = this.parseAircraft(res.data);
              aircrafts[aircraft.name] = aircraft; // overwrite previous aircraft if needed
            } catch (e) {
              // this.logger.error(
              //   `Couldn't save aircraft at ${res.request.path}: ${e}`
              // );
              // FIXME: non-working files are XML, should find a way to parse these
            }
          })
        )
      );
      await this.saveAircrafts();
      return aircrafts;
    }
  }
};
