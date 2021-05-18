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
                return-object
                required
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
            <v-col cols="12">
              <v-switch inset v-model="weather" label="Use Weather" />
            </v-col>
          </v-row>
          <v-subheader>Display</v-subheader>
          <v-divider class="mb-4" />
          <v-row>
            <v-col cols="12">
              <span class="v-label mr-3">Color</span>
              <v-dialog v-model="showColorPicker" width="225px">
                <template v-slot:activator="{ on }">
                  <v-btn fab x-small :color="color" v-on="on" />
                </template>
                <v-color-picker
                  light
                  mode="hexa"
                  v-model="color"
                ></v-color-picker>
              </v-dialog>
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
import PrecisionSlider from "./PrecisionSlider";

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
    PrecisionSlider
  },
  data() {
    return {
      dialog: false,
      waiting: false,
      algorithms: [{ id: "dijkstra", name: "Dijkstra" }],
      showColorPicker: false,
      // options
      algorithm: "dijkstra",
      departure: locations.paris,
      arrival: locations.miami,
      precision: 200,
      directions: 4,
      weather: false,
      color: "#ffffff"
    };
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
    options() {
      const { arrival, departure, precision, directions } = this;
      return { arrival, departure, precision, directions };
    }
  },
  methods: {
    start() {
      this.close();
      this.$progress.message = "calculating ...";
      this.$progress.open();
      axios.post("/api/calculator/run", this.options).then(res => {
        const plan = res.data;
        const options = {
          color: this.color
        };
        this.$progress.close();
        this.$map.display({ plan, options });
      });
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
