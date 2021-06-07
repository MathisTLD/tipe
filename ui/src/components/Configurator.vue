<template>
  <v-dialog v-model="dialog" persistent max-width="800px">
    <v-card>
      <v-card-title>
        <span class="headline">New Odyssey</span>
      </v-card-title>
      <v-card-text>
        <v-container>
          <v-subheader>Itinerary</v-subheader>
          <v-divider />
          <v-row>
            <v-col cols="6">
              <LocationSearch v-model="departure" label="From" required />
            </v-col>
            <v-col cols="6">
              <LocationSearch v-model="arrival" label="To" />
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="algorithm"
                :items="algorithms"
                :disabled="algorithms.length < 2"
                label="Algorithm"
                item-text="name"
                item-value="id"
                hide-details
                required
              />
            </v-col>
            <v-col v-if="algorithm === 'wa*'" cols="12">
              <v-text-field
                label="Heuristic's Weight"
                v-model.number="heurWeight"
                type="number"
                step="0.1"
              />
            </v-col>
            <v-col cols="9">
              <PrecisionSlider v-model="precision" />
            </v-col>
            <v-col cols="3">
              <v-slider
                v-model="directions"
                label="Directions"
                :thumb-label="true"
                min="1"
                max="10"
                hide-details
              />
            </v-col>
            <v-col cols="9">
              <AircraftSelector v-model="aircraft" />
            </v-col>
            <v-col cols="3">
              <v-switch inset v-model="weather" label="Use Weather" />
            </v-col>
          </v-row>
          <v-subheader>Display</v-subheader>
          <v-divider class="mb-4" />
          <v-row>
            <v-col cols="1">
              <v-dialog v-model="showColorPicker" width="225px">
                <template v-slot:activator="{ on }">
                  <v-btn
                    fab
                    x-small
                    :color="color"
                    v-on="on"
                    class="v-input--selection-controls"
                  />
                </template>
                <v-color-picker
                  light
                  mode="hexa"
                  v-model="color"
                ></v-color-picker>
              </v-dialog>
            </v-col>
            <v-col cols="2">
              <v-switch inset v-model="dashed" label="Dashed" />
            </v-col>
            <v-col cols="3">
              <v-switch inset v-model="showCard" label="Show Card" />
            </v-col>
            <v-col cols="3">
              <v-switch inset v-model="showGrid" label="Show Grid" />
            </v-col>
            <v-col cols="3">
              <v-switch inset v-model="showGraph" label="Show Graph" />
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="cancel" color="error"> Cancel </v-btn>
        <v-btn @click="start" color="success"> Let's go </v-btn>
      </v-card-actions>
      <v-overlay absolute="absolute" :value="waiting">
        <v-progress-circular indeterminate size="50" />
      </v-overlay>
    </v-card>
  </v-dialog>
</template>

<script>
import axios from "axios";
import LocationSearch from "./LocationSearch";
import AircraftSelector from "./AircraftSelector";
import PrecisionSlider from "./PrecisionSlider";

import colors from "vuetify/lib/util/colors";
const palette = ["red", "green", "amber", "blue", "purple", "teal"].map(
  name => colors[name].base
);

let colorIndex = 0;
function getColor() {
  const color = palette[colorIndex];
  colorIndex = (colorIndex + 1) % palette.length;
  return color;
}

function toRad(x) {
  return (x * Math.PI) / 180;
}

function distance(loc1, loc2) {
  const { lat: lat1, lon: lon1 } = loc1;
  const { lat: lat2, lon: lon2 } = loc2;
  const R = 6371000; // m
  //has a problem with the .toRad() method below.
  const x1 = lat2 - lat1;
  const dLat = toRad(x1);
  const x2 = lon2 - lon1;
  const dLon = toRad(x2);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const locations = {
  paris: {
    place_id: "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
    description: "Paris, France",
    lat: 48.856614,
    lon: 2.3522219
  },
  brest: {
    place_id: "ChIJk1uS2eG7FkgRqzCcF1iDSMY",
    description: "Brest, France",
    lat: 48.390394,
    lon: -4.486075999999999
  },
  miami: {
    place_id: "ChIJEcHIDqKw2YgRZU-t3XHylv8",
    description: "Miami, FL, USA",
    lat: 25.7616798,
    lon: -80.1917902
  },
  florence: {
    id: "ChIJrdbSgKZWKhMRAyrH7xd51ZM",
    description: "Florence, Metropolitan City of Florence, Italy",
    lat: 43.7695604,
    lon: 11.2558136
  }
};

export default {
  components: {
    LocationSearch,
    PrecisionSlider,
    AircraftSelector
  },
  data() {
    return {
      dialog: false,
      waiting: false,
      algorithms: [
        { id: "dijkstra", name: "Dijkstra" },
        { id: "a*", name: "A*" },
        { id: "wa*", name: "WA*" }
      ],
      heurWeight: 0.8,
      showColorPicker: false,
      // options
      algorithm: "wa*",
      departure: locations.paris,
      arrival: locations.florence,
      precision: null, // automatically set on creation
      directions: 6,
      aircraft: null, // automatically set on creation
      weather: true,
      // display options
      color: getColor(),
      dashed: false,
      showCard: true,
      showGrid: false,
      showGraph: false
    };
  },
  watch: {
    departure() {
      this.updatePrecision();
    },
    arrival() {
      this.updatePrecision();
    }
  },
  computed: {
    $app() {
      return this.$root.$children[0];
    },
    $map() {
      return this.$app.$refs.map;
    },
    $progress() {
      return this.$app.$refs.progress;
    },
    heuristic_weight() {
      switch (this.algorithm) {
        case "dijkstra":
          return 0;
        case "a*":
          return 1;
        case "wa*":
          return this.heurWeight;
        default:
          throw new Error(`Unknown algorithm ${this.algorithm}`);
      }
    },
    options() {
      const { showGraph } = this;
      const {
        arrival,
        departure,
        heuristic_weight,
        precision,
        directions,
        aircraft,
        weather
      } = this;
      return {
        arrival,
        departure,
        heuristic_weight,
        precision,
        directions,
        aircraft,
        weather,
        export_graph: showGraph
      };
    }
  },
  created() {
    this.updatePrecision();
  },
  methods: {
    start() {
      this.close();
      this.$progress.message = "calculating ...";
      this.$progress.open();
      axios
        .post("/api/calculator/run", this.options)
        .then(res => {
          const results = res.data;
          results.options.display = {
            color: this.color,
            dashed: this.dashed,
            showCard: this.showCard,
            showGrid: this.showGrid,
            showGraph: this.showGraph
          };
          this.$progress.close();
          this.$map.addResults(results).display();

          // change color for next itinerary
          this.color = getColor();
        })
        .catch(() => {
          this.$progress.message = "got error"; // TODO: tell more about the failure
          setTimeout(() => {
            this.$progress.close();
          }, 3000);
        });
    },
    autoPrecision() {
      const dBetweenPoles = 20003931.5;
      const d = distance(this.departure, this.arrival);
      // TODO: fine tuning
      const n = Math.round(100 / (d / dBetweenPoles)) || 1; // ensure strictly positive int
      return n;
    },
    updatePrecision() {
      this.precision = this.autoPrecision(); // this value is automatically changed to the closest possible value
    },
    cancel() {
      this.close();
    },
    open() {
      this.dialog = true;
    },
    close() {
      this.dialog = false;
    },
    toggle() {
      if (this.dialog) return this.close();
      else return this.open();
    }
  }
};
</script>
