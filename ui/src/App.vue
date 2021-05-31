<template>
  <v-app>
    <!-- <v-app-bar app dense>
      <v-toolbar-title>FIND_A_NAME</v-toolbar-title>
      <v-spacer />
      {{ version }}
    </v-app-bar> -->

    <v-main>
      <v-container fluid class="fill-height ma-0 pa-0">
        <Map ref="map" />
        <Configurator ref="configurator" />
        <Progress ref="progress" />
        <Actions v-show="!hideActions" />
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import Map from "./components/Map";
import Actions from "./components/Actions";
import Configurator from "./components/Configurator";
import Progress from "./components/Progress";

import html2canvas from "html2canvas";
import hotkeys from "hotkeys-js";

export default {
  components: {
    Map,
    Actions,
    Configurator,
    Progress
  },
  data() {
    return {
      version: require("../../package.json").version,
      hideActions: false
    };
  },
  created() {
    hotkeys("alt+p", event => {
      event.preventDefault();
      this.saveScreenShot();
    });
    hotkeys("alt+h", event => {
      event.preventDefault();
      this.hideActions = !this.hideActions;
      document.body.style.cursor = this.hideActions ? "none" : null;
    });
  },
  methods: {
    async saveScreenShot() {
      function saveCanvas(
        canvas,
        filename = `capture-${new Date().toISOString()}.jpg`
      ) {
        const a = document.createElement("a");
        const url = canvas.toDataURL("image/jpg");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 0);
      }

      const map = this.$refs.map;
      async function cloneCanvas(oldCanvas, scale = 1) {
        //create a new canvas
        const newCanvas = document.createElement("canvas");
        const ctx = newCanvas.getContext("2d");
        //set dimensions
        newCanvas.width = scale * oldCanvas.width;
        newCanvas.height = scale * oldCanvas.height;
        const url = await map.getScreenshot();
        // const url = oldCanvas.toDataURL("image/jpg");
        await new Promise(resolve => {
          const img = new Image();
          img.setAttribute("src", url);
          img.onload = function() {
            ctx.drawImage(img, 0, 0, newCanvas.width, newCanvas.height);
            resolve();
          };
        });
        //return the new canvas
        return newCanvas;
      }
      const mapCanvasClone = await cloneCanvas(map.viewer.scene.canvas, 2);
      await html2canvas(document.body, {
        canvas: mapCanvasClone,
        backgroundColor: null,
        onclone: doc => {
          doc.querySelector(".v-application").style.background = "transparent";
        },
        ignoreElements: el => {
          if (
            el.id === "cesium-credit" ||
            el.classList.contains("cesium-viewer-toolbar") ||
            el.classList.contains("cesium-viewer") ||
            el.classList.contains("v-speed-dial")
          ) {
            return true;
          } else return false;
        }
      }).then(saveCanvas);
    }
  }
};
</script>

<style>
html {
  overflow: hidden !important;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

html::-webkit-scrollbar {
  width: 0;
  height: 0;
}
</style>
