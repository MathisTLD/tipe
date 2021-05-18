<template>
  <v-slider
    v-model="i"
    label="Precision"
    :max="precisions.length - 1"
    :tick-labels="precisions.map(x => x.label)"
    hide-details
  />
</template>

<script>
// https://en.wikipedia.org/wiki/Earth%27s_circumference
// let dBetweenPoles = 20003.9315;

const precisions = [
  { label: "200km", q: 100 },
  { label: "100km", q: 200 },
  { label: "50km", q: 400 },
  { label: "25km", q: 800 },
  { label: "10km", q: 2000 },
  { label: "5km", q: 4000 }
];

export default {
  props: {
    value: {
      required: true,
      type: Number
    }
  },
  data() {
    return {
      i: null,
      precisions
    };
  },
  watch: {
    i(i) {
      let q = this.precisions[i].q;
      this.$emit("input", q);
    },
    value(x) {
      this.i = this.determineIndex(x);
    }
  },
  methods: {
    determineIndex(n) {
      if (!n) return 0;
      const i = precisions
        .map(({ q }) => q)
        .reduce(
          (prev_i, val, curr_i, arr) =>
            Math.abs(val - n) < Math.abs(arr[prev_i] - n) ? curr_i : prev_i,
          0
        );
      return i;
    }
  },
  created() {
    this.i = this.determineIndex(this.value);
  }
};
</script>
