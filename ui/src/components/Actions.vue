<template>
  <v-speed-dial v-model="open" fixed bottom right>
    <template v-slot:activator>
      <v-btn dark fab>
        <v-icon v-if="open"> fa-times </v-icon>
        <v-icon v-else> fa-angle-up </v-icon>
      </v-btn>
    </template>
    <v-btn color="primary" fab @click="toggleConfigurator">
      <v-icon>fa-map-marked</v-icon>
    </v-btn>
    <v-btn color="secondary" fab @click="clear">
      <v-icon>fa-broom</v-icon>
    </v-btn>
    <v-btn color="secondary" fab @click="toggleWind" :outlined="!wind">
      <v-icon>fa-wind</v-icon>
    </v-btn>
  </v-speed-dial>
</template>

<script>
export default {
  data() {
    return {
      open: false
    };
  },
  computed: {
    $app() {
      return this.$root.$children[0];
    },
    $map() {
      return this.$app.$refs.map;
    },
    wind() {
      return this.$map.wind;
    }
  },
  methods: {
    clear() {
      this.$map.clear();
    },
    toggleWind() {
      if (this.wind) this.$map.hideWind();
      else this.$map.showWind();
    },
    toggleConfigurator() {
      this.$app.$refs.configurator.toggle();
    }
  }
};
</script>
