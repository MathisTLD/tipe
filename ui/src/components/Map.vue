<template>
  <div id="map-container">
    <div id="cesium-credit" />
    <div id="cesium-container" />
    <div ref="resultsContainer" id="results-container" v-show="showCards">
      <ResultsCard
        class="ml-2"
        v-for="(result, i) in results"
        :key="i"
        :results="result"
        v-show="result.options.display.showCard"
      />
    </div>
    <WindPanel ref="wind" />
  </div>
</template>

<script>
window.CESIUM_BASE_URL = "";
import * as Cesium from "cesium/Cesium";
import "cesium/Widgets/widgets.css";

import WindPanel from "./WindPanel";
import ResultsCard from "./ResultsCard";

import mapMixin from "./map-mixin";
export default {
  mixins: [mapMixin],
  components: {
    WindPanel,
    ResultsCard,
  },
  data() {
    return {
      loading: true,
      status: "loading map",
      showCards: true,
      results: [],
    };
  },
  computed: {
    $app() {
      return this.$root.$children[0];
    },
    $progress() {
      return this.$app.$refs.progress;
    },
    $wind() {
      return this.$refs.wind;
    },
  },
  watch: {
    "$app.hideActions"(hide) {
      this.viewer.sceneModePicker.container.style.display = hide ? "none" : "";
    },
  },
  async mounted() {
    setTimeout(() => {
      // show the loader
      this.$progress.message = "Preparing ...";
      this.$progress.progression.message = "loading the globe";
      this.$progress.open();
    }, 50);

    this.viewer = new Cesium.Viewer("cesium-container", {
      // UI : hide useless things
      baseLayerPicker: false,
      homeButton: false,
      geocoder: false,
      animation: false,
      timeline: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      creditContainer: "cesium-credit",
      // sceneMode: Cesium.SceneMode.SCENE2D,
      // projection
      imageryProvider: new Cesium.MapboxStyleImageryProvider({
        username: "mathistld",
        styleId: "ckpd3876k0ar917qpozx60uf0",
        accessToken:
          "pk.eyJ1IjoibWF0aGlzdGxkIiwiYSI6ImNrcGQzNDd2cTA1enMyb28xMndhODV4MmoifQ.ViKqvStzsDYsYmH_bmmKxQ",
        scaleFactor: true,
        maximumLevel: 5,
      }), // new Cesium.OpenStreetMapImageryProvider({ url: "https://tile.openstreetmap.org/"}),
      // mapProjection: new Cesium.WebMercatorProjection()
    });
    // remove loader when rendered
    setTimeout(
      function () {
        this.$progress.close();
      }.bind(this),
      3000
    );

    this.$wind.init();
  },
  methods: {
    clear() {
      // clean entities
      this.viewer.entities.removeAll();
      // clear results
      while (this.results.length) {
        this.results.pop();
      }
    },
    getScreenshot() {
      return new Promise((resolve) => {
        const targetResolutionScale = 1.0; // for screenshots with higher resolution set to 2.0 or even 3.0
        const timeout = 0; // in ms
        const viewer = this.viewer;
        const scene = viewer.scene;
        const prepareScreenshot = function () {
          viewer.resolutionScale = targetResolutionScale;
          scene.preRender.removeEventListener(prepareScreenshot);
          // take snapshot after defined timeout to allow scene update (ie. loading data)
          setTimeout(function () {
            scene.postRender.addEventListener(takeScreenshot);
          }, timeout);
        };

        const takeScreenshot = function () {
          scene.postRender.removeEventListener(takeScreenshot);
          const canvas = scene.canvas;
          canvas.toBlob(function (blob) {
            const url = URL.createObjectURL(blob);
            resolve(url);
            // reset resolutionScale
            viewer.resolutionScale = 1.0;
          });
        };
        scene.preRender.addEventListener(prepareScreenshot);
      });
    },
  },
};
</script>

<style lang="scss">
#map-container {
  width: 100%;
  height: 100%;
  position: relative;
}

#cesium-container {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}

#cesium-credit {
  z-index: 0;
}

#results-container {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
}
</style>
