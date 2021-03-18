<template>
  <v-overlay v-model="show">
    <div class="overlay-content">
      <v-container>
        <v-row>
          <v-col cols="12">
            <div class="text-center display-1">
              {{ message }}
            </div>
          </v-col>
          <v-col cols="12">
            <v-progress-linear
              :indeterminate="progression.indeterminate"
              :value="progression.value"
            />
            <div class="text-center">
              {{ progression.message }}
            </div>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </v-overlay>
</template>

<script>
export default {
  data() {
    return {
      show: false,
      message: "loading...",
      progression: {
        indeterminate: true,
        message: "",
        value: 0,
      },
    };
  },
  methods: {
    open() {
      if (!this.show) this.show = true;
    },
    close() {
      if (this.show) this.show = false;
      this.reset();
    },
    reset() {
      Object.assign(this, {
        message: "loading...",
        progression: {
          indeterminate: true,
          message: "",
          value: 0,
        },
      });
    },
  },
};
</script>

<style>
.overlay-content {
  max-width: 90vw;
  width: 500px;
}
</style>
