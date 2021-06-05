import * as Cesium from "cesium/Cesium";
window.Cesium = Cesium;

function cleanup() {
  this.viewer.entities.removeAll();
}

function setView(loc) {
  this.viewer.camera.setView({
    destination: new Cesium.Cartesian3.fromDegrees(loc.lon, loc.lat, loc.alt)
  });
}

import { displayGraph, displayGrid } from "./draw";

function displayResults(results) {
  console.log("displaying results", results);
  const { options } = results;
  const { departure, arrival } = options;
  this.results.push(results);
  const color = Cesium.Color.fromCssColorString(options.display.color);
  console.log("ok");
  if (options.display.showGrid) {
    displayGrid.call(this, options.precision, 10 - this.results.length, color);
  }
  if (options.display.showGraph) {
    displayGraph.call(this, results);
  }
  setView.call(this, {
    lon: (departure.lon + arrival.lon) / 2,
    lat: (departure.lat + arrival.lat) / 2,
    alt: 8000000
  });
  const coordinates = results.path
    .map(({ loc }) => {
      return [loc.lon, loc.lat, 100 /* loc.alt */]; // visual effect isn't that good when showing altitude
    })
    .flat();
  this.viewer.entities.add({
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(coordinates),
      material: color,
      width: 3
    }
  });
}

export default {
  methods: {
    cleanup,
    setView,
    displayResults
  }
};
