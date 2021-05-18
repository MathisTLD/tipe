<template>
  <div id="mapContainer">
    <div id="cesiumCredit" />
    <div id="cesiumContainer" />
  </div>
</template>

<script>
window.CESIUM_BASE_URL = "";
import * as Cesium from "cesium/Cesium";
import "cesium/Widgets/widgets.css";

// TODO: make heatmaps work or delete them
import Wind3D from "./Wind/Wind3D";

import mapMixin from "./map-mixin";
export default {
  mixins: [mapMixin],
  data() {
    return {
      loading: true,
      status: "loading map",
      wind: false
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

    this.viewer = new Cesium.Viewer("cesiumContainer", {
      // UI : hide useless things
      baseLayerPicker: false,
      homeButton: false,
      geocoder: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      creditContainer: "cesiumCredit",
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
    this.showWind();
  },
  beforeDestroy() {
    this.hideWind(); // prevents errors on hot relaod
  },
  methods: {
    clearEntities() {
      this.viewer.entities.removeAll();
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
#mapContainer {
  width: 100%;
  height: 100%;
  position: relative;
}

#cesiumContainer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}

#cesiumCredit {
  z-index: 0;
}
</style>
