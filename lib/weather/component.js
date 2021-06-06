/* component */
const path = require("path");
const fs = require("fs-extra");

const { exec } = require("child_process");

const axios = require("axios");

const HOUR = 3600 * 1000;

module.exports = {
  created() {
    this.dataDir = this.$app.resolvePath("#data/weather");
    fs.ensureDirSync(this.dataDir);
    this.$hooks["start"].tap("DownloadWeatherData", () => {
      this.startAutoDownload(2 * HOUR);
      this.waitForData = this.ensureFiles(
        new Date(),
        new Date(Date.now() + 48 * HOUR)
      ).then(() => this.cleanup(new Date(Date.now() - 48 * HOUR)));
    });

    this._pendingDownloads = new Set();
  },
  methods: {
    getFileForDate(_date, dir) {
      const date = new Date(_date);
      date.setUTCMinutes(0, 0, 0);
      const dateISO = date.toISOString();
      const day = dateISO.replace(/-/g, "").slice(0, 8),
        hour = dateISO.slice(11, 13);
      const BASE_DIR = path.resolve(this.dataDir, dir);
      const dayDir = path.resolve(BASE_DIR, day);
      if (!fs.pathExistsSync(dayDir)) throw new Error(`No dir for day ${day}`);
      const files = fs.readdirSync(dayDir);
      const fileName = files.find((name) => name.startsWith(hour));
      if (!fileName) throw new Error(`No file for hour ${hour}`);
      return path.resolve(dayDir, fileName);
    },
    async ensureFiles(from, to) {
      if (!(from.getTime() < to.getTime()))
        throw new TypeError(
          `from must be older than to. Got: ${from} -> ${to}`
        );
      const firstDate = new Date(from.getTime());
      firstDate.setMinutes(0, 0, 0);
      const dates = [firstDate];
      let last = to.getTime();
      while (dates[dates.length - 1].getTime() <= last - HOUR) {
        dates.push(new Date(dates[dates.length - 1].getTime() + HOUR));
      }
      for (let date of dates) {
        await this.download(date, false);
      }
      this.logger.info(`weather data from ${firstDate} to ${to} downloaded`);
    },
    startAutoDownload(interval, period = 24 * HOUR) {
      const doAutoDownload = () => {
        this._autoDownloadTimeout = setTimeout(() => {
          this.ensureFiles(new Date(), new Date(Date.now() + period)).then(() =>
            this.cleanup()
          );
          if (this._autoDownload) doAutoDownload();
        }, interval);
      };
      this._autoDownload = true;
      doAutoDownload();
    },
    stopAutoDownload() {
      clearTimeout(this._autoDownloadTimeout);
      this._autoDownload = false;
    },
    async download(date, overwrite = false) {
      await Promise.all([this.downloadWind(date, overwrite)]);
    },
    async cleanup(deleteBeforeDate = new Date(Date.now() - 60 * 1000)) {
      // set deleteBeforeDate to false to keep old files
      await Promise.all([this.cleanupWind(deleteBeforeDate)]);
      this.logger.info("weather data cleaned up");
    },
    async downloadWind(_date, overwrite = false) {
      const date = new Date(_date);
      date.setUTCMinutes(0, 0, 0);
      const baseDate = new Date(date);
      // ensure baseDate is older than 12 hours ago
      if (baseDate.getTime() > Date.now() - 12 * HOUR) {
        baseDate.setTime(Date.now() - 12 * HOUR);
      }
      // ensure baseDate hours is a multiple of 6
      const utcHours = baseDate.getUTCHours();
      baseDate.setUTCHours(utcHours - (utcHours % 6), 0, 0, 0);

      // ensure forecast is an integer
      const forecast = Math.round((date.getTime() - baseDate.getTime()) / HOUR);

      const dateISO = date.toISOString();
      const day = dateISO.replace(/-/g, "").slice(0, 8),
        hour = dateISO.slice(11, 13);
      const dlId = `wind:${dateISO}`;
      if (this._pendingDownloads.has(dlId)) return;
      else this._pendingDownloads.add(dlId);

      const baseDateISO = baseDate.toISOString();
      const baseDay = baseDateISO.replace(/-/g, "").slice(0, 8),
        baseHour = baseDateISO.slice(11, 13);

      const WIND_DIR = path.resolve(this.dataDir, "wind");
      const filePath = path.resolve(
        WIND_DIR,
        day,
        `${hour}.0p25.f${baseDay}-${baseHour}.grib2`
      );
      if (!overwrite && (await fs.pathExists(filePath))) return;
      else {
        const pressureAltitude = []; // pressure altitude we wand data for in mb
        // FIXME: files are way too heavy, need to reduce selected altitudes range
        for (let i = 100; i <= 900; i += 100) {
          pressureAltitude.push(i);
        }
        const description = `${dateISO.slice(0, 13)} ${
          forecast > 0 ? `(forecast from ${baseDateISO.slice(0, 13)}) ` : ""
        }`;
        this.logger.verbose(`Wind: requiring grib for ${description}...`);
        await axios
          .get("https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl", {
            params: {
              // date
              // .anl from analyse data .XXX for forecast XXX (see https://www.nco.ncep.noaa.gov/pmb/products/gfs/)
              file: `gfs.t${baseHour}z.pgrb2.0p25.f${forecast
                .toString()
                .padStart(3, "0")}`,
              dir: `/gfs.${baseDay}/${baseHour}/atmos`,
              // vars (see https://www.nco.ncep.noaa.gov/pmb/products/gfs/gfs.t00z.pgrb2.0p25.f000.shtml)
              ...Object.fromEntries(
                pressureAltitude.map((alt) => [`lev_${alt}_mb`, "on"])
              ),
              var_UGRD: "on",
              var_VGRD: "on",
              // zone
              leftlon: "0",
              rightlon: "360",
              toplat: "90",
              bottomlat: "-90",
            },
            responseType: "arraybuffer",
            timeout: 10000,
          })
          .then((res) =>
            fs
              .outputFile(filePath, Buffer.from(res.data))
              .then(
                this.logger.verbose(
                  `Wind: saved grib file for ${description} !`
                )
              )
          )
          .catch((err) => {
            this.logger.error(
              `Can't download wind data for ${description}: ${err}`
            );
          });
        this._pendingDownloads.delete(dlId);
      }
    },
    async cleanupWind(deleteBeforeDate = null) {
      if (deleteBeforeDate)
        this.logger.verbose(`deleting wind before ${deleteBeforeDate}`);
      const WIND_DIR = path.resolve(this.dataDir, "wind");
      if (!(await fs.pathExists(WIND_DIR))) return;
      // converts ISO YYYYMMDD to js Date
      const dayToDate = (day) =>
        new Date(
          `${day.substring(0, 4)}-${day.substring(4, 6)}-${day.substring(
            6,
            8
          )}T00:00:00Z`
        );
      for (let dir of await fs.readdir(WIND_DIR)) {
        const dirPath = path.resolve(WIND_DIR, dir);
        if (await fs.stat(dirPath).then((stats) => !stats.isDirectory()))
          continue;
        const date = dayToDate(dir);
        if (
          deleteBeforeDate &&
          date.getTime() < new Date(deleteBeforeDate).setUTCHours(0, 0, 0, 0)
        ) {
          // everything in dir is outdated
          await fs.remove(dirPath);
        } else {
          const files = await fs
            .readdir(dirPath)
            .then((names) =>
              names.map((name) => {
                const file = {
                  name,
                  path: path.resolve(dirPath, name),
                };
                // parse forecast
                const forecastStr = name.match(/(?<=f).*(?=\.grib2)/)[0];
                file.forecast = forecastStr
                  ? new Date(
                      dayToDate(forecastStr.substring(0, 8))
                        .toISOString()
                        .replace(
                          /T[0-9]{2}/,
                          `T${forecastStr.substring(9, 11)}`
                        )
                    )
                  : null;
                file.date = new Date(
                  new Date(date).setUTCHours(parseInt(name.substring(0, 2)))
                );
                return file;
              })
            )
            .then((filesArr) => {
              const files = {};
              filesArr.forEach((file) => {
                const dateStr = file.date.toISOString();
                if (!(dateStr in files)) files[dateStr] = [];
                files[dateStr].push(file);
              });
              return files;
            });
          const filesToDelete = [];
          Object.values(files).forEach((filesForDate) => {
            // sort by release date desc
            filesForDate.sort(
              (a, b) =>
                (b.forecast ? b.forecast.getTime() : b.date.getTime()) -
                (a.forecast ? a.forecast.getTime() : a.date.getTime())
            );
            // only keep latest
            const filesToDeleteForDate = filesForDate.slice(1);
            if (filesToDeleteForDate.length)
              this.logger.verbose(
                `Wind: deleting ${filesToDeleteForDate
                  .map(({ name }) => name)
                  .join(",")} / keeping ${filesForDate[0].name}`
              );
            filesToDelete.push(...filesToDeleteForDate);
          });
          await Promise.all(filesToDelete.map((file) => fs.remove(file.path)));
        }
      }
    },
    async getLiveWind() {
      // TODO: cache json file
      const gribFile = this.getFileForDate(new Date(), "wind");
      const json = await new Promise((resolve, reject) =>
        exec(
          `grib_dump -j -w level:i=900 ${gribFile}`,
          {
            maxBuffer: 32 * 1024 * 1024,
          },
          (err, stdout) => {
            if (err) reject(err);
            else {
              const obj = JSON.parse(stdout);
              const json = obj.messages.map((msg) => {
                const message = Object.fromEntries(
                  msg.map(({ key, value }) => [key, value])
                );
                return message;
              });
              resolve(json);
            }
          }
        )
      );
      return json;
    },
  },
};
