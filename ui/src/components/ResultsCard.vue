<template>
  <v-card :style="{ borderBottom: `5px solid ${color}` }">
    <v-card-text class="pa-0 py-2">
      <v-list-item v-for="(field, i) in fields" :key="i" dense>
        <v-list-item-icon class="mx-1">
          <v-icon small>{{ field.icon }}</v-icon>
        </v-list-item-icon>
        <v-list-item-subtitle>{{ field.text }}</v-list-item-subtitle>
      </v-list-item>
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
    fields() {
      return [
        { icon: "fa-plane", text: "???" },
        { icon: "fa-stopwatch", text: this.duration },
        { icon: "fa-gas-pump", text: this.fuel }
      ];
    }
  }
};
</script>
