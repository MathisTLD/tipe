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
