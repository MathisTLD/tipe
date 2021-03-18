<template>
  <v-dialog v-model="dialog" persistent max-width="800px">
    <template v-slot:activator="{ on }">
      <v-btn color="accent" absolute bottom right v-on="on">
        <v-icon>fa-map-marked</v-icon>
      </v-btn>
    </template>
    <v-card>
      <v-card-title>
        <span class="headline">New Odyssey</span>
      </v-card-title>
      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-select
                v-model="algorithm"
                :items="algorithms"
                :disabled="algorithms.length < 2"
                label="Algorithm"
                item-text="name"
                item-value="id"
                return-object
                required
              />
            </v-col>
          </v-row>
          <v-row justify="space-around">
            <v-col cols="6">
              <LocationSearch v-model="from" label="From" required />
            </v-col>
            <v-col cols="6">
              <LocationSearch v-model="to" label="To" />
            </v-col>
            <v-col cols="12">
              <PrecisionSlider v-model="precision" />
            </v-col>
            <v-col cols="12">
              <v-switch inset v-model="weather" label="Use Weather" />
            </v-col>
            <v-col cols="12" v-if="weather"><ShipPicker v-model="ship"/></v-col>
            <v-col cols="6">
              <v-switch inset v-model="debug" label="Display Graph" />
            </v-col>
            <v-col cols="6" align-self="center">
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
import LocationSearch from "./LocationSearch";
import PrecisionSlider from "./PrecisionSlider";

const locations = {
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
      from: locations.brest,
      to: locations.florence,
      precision: 200,
      weather: false,
      debug: false,
      color: "#ffffff"
    };
  },
  computed: {
    $main() {
      return this.$parent.$parent.$parent;
    },
    $map() {
      return this.$main.$refs.map;
    },
    props() {
      return {};
    }
  },
  methods: {
    async start() {},
    close() {
      this.dialog = false;
    },
    cancel() {
      this.close();
    }
  }
};
</script>
