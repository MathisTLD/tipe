<template>
  <v-slider
    v-model="i"
    label="Precision"
    :max="precisions.length - 1"
    :tick-labels="precisions.map(x => x.label)"
  />
</template>

<script>
// https://en.wikipedia.org/wiki/Earth%27s_circumference
// let dBetweenPoles = 20003.9315;

let precisions = [
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
    }
  },
  created() {
    this.i = this.precisions.filter(({ q }) => q <= this.value).length - 1;
  }
};
</script>
