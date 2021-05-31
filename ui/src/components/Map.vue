<template>
  <div id="map-container">
    <div id="cesium-credit" />
    <div id="cesium-container" />
    <div ref="resultsContainer" id="results-container">
      <ResultsCard
        class="ml-2"
        v-for="(result, i) in results"
        :key="i"
        :results="result"
      />
    </div>
  </div>
</template>

<script>
window.CESIUM_BASE_URL = "";
import * as Cesium from "cesium/Cesium";
import "cesium/Widgets/widgets.css";

import ResultsCard from "./ResultsCard";

import Wind3D from "./Wind/Wind3D";

import mapMixin from "./map-mixin";
export default {
  mixins: [mapMixin],
  components: {
    ResultsCard
  },
  data() {
    return {
      loading: true,
      status: "loading map",
      wind: false,
      results: []
    };
  },
  computed: {
    $app() {
      return this.$root.$children[0];
    },
    $progress() {
      return this.$app.$refs.progress;
    }
  },
  watch: {
    "$app.hideActions"(hide) {
      this.viewer.sceneModePicker.container.style.display = hide ? "none" : "";
    }
  },
  async mounted() {
    // show the loader
    this.$progress.message = "Preparing ...";
    this.$progress.progression.message = "loading the globe";
    this.$progress.open();

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
      imageryProvider: new Cesium.OpenStreetMapImageryProvider({
        url: "https://tile.openstreetmap.org/"
      }),
      mapProjection: new Cesium.WebMercatorProjection()
    });

    // remove loader when rendered
    setTimeout(
      function() {
        this.$progress.close();
      }.bind(this),
      3000
    );
    // hide wind when not in 3D
    this.viewer.scene.morphStart.addEventListener((_, prevMode) => {
      if (prevMode === 3) this.hideWind();
    });
    this.viewer.scene.morphComplete.addEventListener(
      (_, prevMode, nextMode) => {
        if (nextMode === 3) this.showWind();
      }
    );

    if (this.viewer.scene._mode === 3) this.showWind();
  },
  beforeDestroy() {
    this.hideWind(); // prevents errors on hot relaod
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
    showWind() {
      this.wind3D = new Wind3D(this.viewer, false); // snd arg represents debug mode
      this.wind = true;
    },
    hideWind() {
      if (this.wind3D) {
        this.wind3D.destroy();
        delete this.wind3D;
        this.wind = false;
      }
    },
    getScreenshot() {
      return new Promise(resolve => {
        const targetResolutionScale = 1.0; // for screenshots with higher resolution set to 2.0 or even 3.0
        const timeout = 0; // in ms
        const viewer = this.viewer;
        const scene = viewer.scene;
        const prepareScreenshot = function() {
          viewer.resolutionScale = targetResolutionScale;
          scene.preRender.removeEventListener(prepareScreenshot);
          // take snapshot after defined timeout to allow scene update (ie. loading data)
          setTimeout(function() {
            scene.postRender.addEventListener(takeScreenshot);
          }, timeout);
        };

        const takeScreenshot = function() {
          scene.postRender.removeEventListener(takeScreenshot);
          const canvas = scene.canvas;
          canvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            resolve(url);
            // reset resolutionScale
            viewer.resolutionScale = 1.0;
          });
        };
        scene.preRender.addEventListener(prepareScreenshot);
      });
    }
  }
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
