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
    Progress,
  },
  data() {
    return {
      version: require("../../package.json").version,
      hideActions: false,
    };
  },
  created() {
    this._ondragover = (ev) => ev.preventDefault();
    this._ondrop = async (ev) => {
      ev.preventDefault();
      if (ev.dataTransfer && ev.dataTransfer.files) {
        for (let file of ev.dataTransfer.files) {
          if (file.type === "application/json") {
            const json = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => {
                resolve(reader.result);
              };
              reader.readAsText(file);
            });
            const obj = JSON.parse(json);
            if (
              Array.isArray(obj) &&
              obj.every((x) => "plan" in x && "options" in x)
            ) {
              // file is results (old format)
              const results = obj.map((x) => {
                const res = {};
                const { plan, options } = x;
                res.path = plan.path;
                res.stats = {
                  time: plan.time,
                  nb_nodes: plan.graph.length,
                  graph: plan.graph,
                };
                const {
                  aircraft,
                  arrival,
                  departure,
                  directions,
                  precision,
                  weather,
                  algorithm,
                  // display
                  color,
                  showCard,
                  showGrid,
                  showGraph,
                } = options;
                res.options = {
                  aircraft,
                  arrival,
                  departure,
                  directions,
                  precision,
                  weather,
                  heuristic_weight: algorithm === "dijkstra" ? 0 : 1,
                  display: {
                    color,
                    showCard: !!showCard,
                    showGrid: !!showGrid,
                    showGraph: !!showGraph,
                  },
                };
                return res;
              });
              this.importResults(results);
            } else if (
              Array.isArray(obj) &&
              obj.every((x) => "path" in x && "options" in x && "stats" in x)
            ) {
              // file is results (new format)
              this.importResults(obj);
            } else if (
              Array.isArray(obj) &&
              obj.length === 2 &&
              obj.every(
                (x) =>
                  "latitudeOfFirstGridPointInDegrees" in x &&
                  x.name.endsWith("wind")
              )
            ) {
              // file is wind data
              this.$map.$wind.loadData(obj);
            } else {
              console.error("unsupported imported object", obj);
            }
          }
        }
      }
    };
    window.addEventListener("dragover", this._ondragover);
    window.addEventListener("drop", this._ondrop);

    hotkeys("alt+p", (event) => {
      event.preventDefault();
      this.saveScreenShot();
    });
    hotkeys("alt+h,alt+shift+h", (event, handler) => {
      event.preventDefault();
      this.hideActions = !this.hideActions;
      document.body.style.cursor = this.hideActions ? "none" : null;

      this.$map.showCards = true;
      if (handler.key === "alt+shift+h") {
        // also toggle results card
        this.$map.showCards = !this.$map.showCards;
      }
    });
    hotkeys("alt+s", (event) => {
      event.preventDefault();
      this.exportResults();
    });
  },
  beforeDestroy() {
    window.removeEventListener("dragover", this._ondragover);
    window.removeEventListener("drop", this._ondrop);
  },
  computed: {
    $map() {
      return this.$refs.map;
    },
  },
  methods: {
    async saveFile(dataUrl, filename) {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(dataUrl);
      }, 0);
    },
    async exportResults() {
      const json = JSON.stringify(this.$refs.map.results, null, 2);
      const blob = new Blob([json], { type: "text/plain" });
      await this.saveFile(URL.createObjectURL(blob), "results.json");
    },
    async importResults(results) {
      results.forEach((res) => this.$map.addResults(res).display());
    },
    async saveScreenShot() {
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
        await new Promise((resolve) => {
          const img = new Image();
          img.setAttribute("src", url);
          img.onload = function () {
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
        onclone: (doc) => {
          doc.querySelector(".v-application").style.background = "transparent";
        },
        ignoreElements: (el) => {
          if (
            el.id === "cesium-credit" ||
            el.classList.contains("cesium-viewer-toolbar") ||
            el.classList.contains("cesium-viewer") ||
            el.classList.contains("v-speed-dial")
          ) {
            return true;
          } else return false;
        },
      }).then((canvas) => {
        this.saveFile(
          canvas.toDataURL("image/jpg"),
          `capture-${new Date().toISOString()}.jpg`
        );
      });
    },
  },
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
