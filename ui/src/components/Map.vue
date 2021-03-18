<template>
  <div id="mapContainer">
    <Progress ref="progress" />
    <div id="cesiumCredit" />
    <div id="cesiumContainer" />
  </div>
</template>

<script>
window.CESIUM_BASE_URL = "";
import * as Cesium from "cesium/Cesium";
import "cesium/Widgets/widgets.css";

import Progress from "./Progress";
// import mapMixin from "./map-mixin";
export default {
  // mixins: [mapMixin],
  components: {
    Progress
  },
  data() {
    return {
      loading: true,
      status: "loading map",
      cache: {}
    };
  },
  computed: {
    $progress() {
      return this.$refs.progress;
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
      mapProjection: new Cesium.WebMercatorProjection()
    });

    // remove loader when rendered
    setTimeout(
      function() {
        this.$progress.close();
      }.bind(this),
      3000
    );
  },
  methods: {
    clearEntities() {
      this.viewer.entities.removeAll();
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
