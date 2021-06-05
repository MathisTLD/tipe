const axios = require("axios");

const $axios = axios.create({
  timeout: 2000,
});

module.exports = {
  methods: {
    async saveLocation(loc) {
      const saved = this.locations.find({ id: loc.id }).value();
      if (!saved) {
        await this.locations.push(loc).write();
      }
    },
    async autocomplete(input) {
      const GOOGLE_API_KEY = this.$config.googleApiKey;
      const candidates = await $axios
        .get("https://maps.googleapis.com/maps/api/place/autocomplete/json", {
          params: {
            key: GOOGLE_API_KEY,
            input,
            fields: "place_id,geometry/location,formatted_address",
            type: "(cities)",
          },
        })
        .then((res) => {
          const data = res.data;
          if (data.status == "OK") {
            const candidates = data.predictions.map(
              ({ place_id, description }) => ({
                place_id,
                description,
              })
            );
            return candidates;
          } else if (data.status == "ZERO_RESULTS") {
            return [];
          } else {
            throw `request failed with status ${data.status} : ${data.error_message}`;
          }
        });
      return candidates;
    },
    async geocode(place_id) {
      const saved = this.locations.find({ id: place_id }).value();
      if (saved) {
        return saved;
      } else {
        const GOOGLE_API_KEY = this.$config.googleApiKey;
        const location = await $axios
          .get("https://maps.googleapis.com/maps/api/place/details/json", {
            params: {
              key: GOOGLE_API_KEY,
              place_id,
              fields: "geometry/location,formatted_address",
            },
          })
          .then((res) => {
            const data = res.data;
            if (data.status == "OK") {
              const { lat, lng } = data.result.geometry.location;
              return {
                id: place_id,
                location: { lat, lon: lng },
                description: data.result.formatted_address,
              };
            } else {
              throw `request failed with status ${data.status} : ${data.error_message}`;
            }
          });
        await this.saveLocation(location);
        return location;
      }
    },
  },
  created() {
    // app's db is not available before app's init hook
    this.$hooks["start:before"].tap("GetLocationDB", async () => {
      this.locations = await this.$app.db.then((db) => db.get("locations"));
    });
    // add api endpoints
    this.router.get("/autocomplete", async (req, res) => {
      if (req.query.input) {
        try {
          const results = await this.autocomplete(req.query.input);
          res.status(200).json(results);
        } catch (e) {
          this.logger.error(e);
          const msg = JSON.stringify(e);
          res.status(400).json({ msg });
        }
      } else {
        res.status(400).json({ msg: "Please provide a valid input" });
      }
    });
    this.router.get("/geocode", async (req, res) => {
      if (req.query.place_id) {
        try {
          const location = await this.geocode(req.query.place_id);
          res.status(200).json(location);
        } catch (e) {
          res.status(400).json({ msg: JSON.stringify(e) });
        }
      } else {
        res.status(400).json({ msg: "Please provide a valid place_id" });
      }
    });
    this.router.get("/get-saved", async (req, res) => {
      res.json(this.locations.value());
    });
  },
};
