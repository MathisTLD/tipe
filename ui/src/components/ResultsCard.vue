<template>
  <v-card
    :style="{ borderBottom: `5px solid ${color}` }"
    width="180px"
    @click="showDetails = !showDetails"
  >
    <v-card-text class="pa-0 py-2">
      <v-list dense>
        <v-list-item v-for="(field, i) in fields" :key="i">
          <v-list-item-icon class="mr-1">
            <v-icon small>{{ field.icon }}</v-icon>
          </v-list-item-icon>
          <v-list-item-subtitle>{{ field.text }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>
      <v-expand-transition>
        <v-list v-show="showDetails" dense>
          <v-divider></v-divider>
          <v-list-item>
            <v-list-item-subtitle>
              {{ algorithm }}
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item>
            <v-list-item-icon class="mr-1">
              <v-icon small>fa-microchip</v-icon>
            </v-list-item-icon>
            <v-list-item-subtitle
              >{{ (results.plan.time / 1000).toFixed(1) }} s
            </v-list-item-subtitle>
            <v-list-item-icon class="mr-1">
              <v-icon small>fa-project-diagram</v-icon>
            </v-list-item-icon>
            <v-list-item-subtitle>{{
              results.plan.graph.length
            }}</v-list-item-subtitle>
          </v-list-item>
          <v-list-item>
            <v-list-item-icon class="mr-1">
              <v-icon small :disabled="!results.options.weather">
                fa-wind
              </v-icon>
            </v-list-item-icon>
            <v-list-item-subtitle>{{
              results.options.weather ? "enabled" : "disabled"
            }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-expand-transition>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  props: {
    results: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      showDetails: false
    };
  },
  computed: {
    color() {
      return this.results.options.color;
    },
    duration() {
      const path = this.results.plan.path;
      const duration = path[path.length - 1].date - path[0].date;
      const minutes = Math.floor(duration / (60 * 1000)) % 60;
      const hours = Math.floor(duration / (60 * 60 * 1000));
      return (
        (hours ? `${hours} H ` : "") +
        `${minutes.toString().padStart(2, "0")} min`
      );
    },
    fuel() {
      const path = this.results.plan.path;
      const consumption = Math.abs(path[path.length - 1].fuel - path[0].fuel); // in m3
      return `${(consumption * 1000).toFixed(0)} L`;
    },
    algorithm() {
      const upperFirst = str => str.charAt(0).toUpperCase() + str.slice(1);
      return upperFirst(this.results.options.algorithm);
    },
    fields() {
      return [
        { icon: "fa-plane", text: this.results.options.aircraft },
        { icon: "fa-stopwatch", text: this.duration },
        { icon: "fa-gas-pump", text: this.fuel }
      ];
    }
  }
};
</script>
