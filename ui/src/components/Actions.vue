<template>
  <v-speed-dial v-model="open" fixed bottom left>
    <template v-slot:activator>
      <v-btn dark fab>
        <v-icon v-if="open"> fa-times </v-icon>
        <v-icon v-else> fa-angle-up </v-icon>
      </v-btn>
    </template>
    <v-btn fab icon @click="clearEntities">
      <v-icon>fa-broom</v-icon>
    </v-btn>
  </v-speed-dial>
</template>

<script>
export default {
  data() {
    return {
      open: false,
    };
  },
  computed: {
    $main() {
      return this.$parent.$parent.$parent;
    },
    $map() {
      return this.$main.$refs.map;
    },
  },
  methods: {
    clearEntities() {
      this.$map.clearEntities();
    },
  },
};
</script>
