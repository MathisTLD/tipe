<template>
  <v-autocomplete
    v-model="selected"
    :value="value"
    :items="aircrafts"
    :loading="loading"
    hide-no-data
    hide-details
    item-text="name"
    prepend-icon="fa-plane"
    placeholder="Beech Baron"
    clearable
    @change="select"
  />
</template>

<script>
import axios from "axios";

export default {
  props: ["value"],
  data() {
    return {
      aircrafts: [],
      selected: "Beech Baron",
      loading: true,
    };
  },
  methods: {
    async fetchAircrafts() {
      this.aircrafts.push(
        ...(await axios
          .get("/api/aircrafts/get")
          .then((res) => Object.values(res.data)))
      );
      this.loading = false;
    },
    select() {
      this.$emit("input", this.selected);
    },
  },
  created() {
    if (this.value) this.selected = this.value;
    else this.select();
    this.fetchAircrafts();
  },
};
</script>
