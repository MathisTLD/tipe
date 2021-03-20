/* component */

const path = require("path");
const fs = require("fs-extra");

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
        // FIXME: fetching only ine hour to save time but might need to increase to 48 in the future
        new Date(Date.now() + 1 * HOUR)
      ).then(() => this.cleanup());
    });

    this._pendingDownloads = new Set();
  },
  methods: {
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
      this.logger.verbose(`weather data from ${firstDate} to ${to} downloaded`);
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
    async cleanup(deleteBeforeDate = new Date()) {
      // set deleteBeforeDate to false to keep old files
      await Promise.all([this.cleanupWind(deleteBeforeDate)]);
      this.logger.verbose("weather data cleaned up");
    },
    async downloadWind(_date, overwrite = false) {
      const date = new Date(_date);
      date.setUTCMinutes(0, 0, 0);
      const baseDate = new Date(date);
      // ensure baseDate is older than 6 hours ago
      if (baseDate.getTime() > Date.now() - 6 * HOUR) {
        baseDate.setTime(Date.now() - 6 * HOUR);
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
        `${hour}.0p25.${
          forecast === 0 ? "anl" : `f${baseDay}-${baseHour}`
        }.grib2`
      );
      if (!overwrite && (await fs.pathExists(filePath))) return;
      else {
        const pressureAltitude = []; // pressure altitude we wand data for in mb
        for (let i = 100; i <= 900; i += 50) {
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
              dir: `/gfs.${baseDay}/${baseHour}`,
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
  },
};