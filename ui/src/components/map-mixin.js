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
  const { plan, options } = results;
  const { departure, arrival } = plan.options;
  this.results.push(results);
  console.log("displaying results", results);
  if (options.showGrid) {
    displayGrid.call(
      this,
      options.precision,
      10 - this.results.length,
      Cesium.Color.fromCssColorString(options.color)
    );
  }
  if (options.showGraph) {
    displayGraph.call(this, results);
  }
  setView.call(this, {
    lon: (departure.lon + arrival.lon) / 2,
    lat: (departure.lat + arrival.lat) / 2,
    alt: 8000000
  });
  const coordinates = plan.path
    .map(({ loc }) => {
      return [loc.lon, loc.lat, 100 /* loc.alt */]; // visual effect isn't that good when showing altitude
    })
    .flat();
  this.viewer.entities.add({
    polyline: {
      positions: new Cesium.Cartesian3.fromDegreesArrayHeights(coordinates),
      material: new Cesium.Color.fromCssColorString(options.color),
      width: 3
    }
  });
}

export default {
  methods: {
    cleanup,
    setView,
    display: displayResults
  }
};
