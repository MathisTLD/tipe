import * as Cesium from "cesium/Cesium";

import gradient from "./gradient";

import {
  grid as gridPrimitive
  // directions as directionsPrimitive
} from "../primitives";

let id = 0;
class Results {
  constructor(map, results) {
    this.id = id++;
    this.$map = map;
    Object.assign(this, results);
    this._primitives = {};
  }
  setView() {
    const { departure, arrival } = this.options;
    const lon = (departure.lon + arrival.lon) / 2;
    const lat = (departure.lat + arrival.lat) / 2;
    const alt = 8000000;
    this.viewer.camera.setView({
      destination: new Cesium.Cartesian3.fromDegrees(lon, lat, alt)
    });
  }
  display() {
    this.setView();
    const { showGrid, showGraph } = this.options.display;
    this.displayPath();
    if (showGrid) this.displayGrid();
    if (showGraph) this.displayGraph();
  }
  displayPath() {
    const color = Cesium.Color.fromCssColorString(this.options.display.color);
    const material = this.options.display.dashed
      ? Cesium.Material.fromType("PolylineDash", { color, dashLength: 20 })
      : Cesium.Material.fromType("Color", { color });
    const coordinates = this.path
      .map(({ loc }) => {
        // FIXME: showing fake altitude could be misleading
        return [loc.lon, loc.lat, this.id * 10000 /* loc.alt */]; // visual effect isn't that good when showing altitude
      })
      .flat();
    const polylines = new Cesium.PolylineCollection();
    polylines.add({
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(coordinates),
      material,
      width: 3
    });
    this.viewer.scene.primitives.add(polylines);
    this._primitives.path = polylines;
  }
  displayGraph() {
    if (!this.stats.graph) throw new Error("no grpah data provided");
    const min = this.path[0].date;
    const max = this.path[this.results.path.length - 1].date;
    const span = max - min;
    const points = this.viewer.scene.primitives.add(
      new Cesium.PointPrimitiveCollection()
    );
    this.stats.graph.forEach(({ loc, date }) => {
      const cost = (date - min) / span;
      const color = Cesium.Color.fromCssColorString(
        gradient.rgbAt(cost > 1 ? 1 : cost).toRgbString()
      );
      points.add({
        position: Cesium.Cartesian3.fromDegrees(loc.lon, loc.lat),
        pixelSize: 2,
        color
      });
    });
    this._primitives.graph = points;
  }
  displayGrid() {
    this._primitives.grid = this.viewer.scene.primitives.add(
      gridPrimitive(
        this.options.precision,
        this.id * 100,
        Cesium.Color.fromCssColorString(this.options.display.color)
      )
    );
  }
  hide() {
    this.removePath();
    this.removeGraph();
    this.removeGrid();
  }
  removePrimitive(key) {
    const primitive = this._primitives[key];
    if (primitive) {
      this.viewer.scene.primitives.remove(primitive);
      primitive.destroy();
    }
    delete this._primitives[key];
  }
  removePath() {
    this.removePrimitive("path");
  }
  removeGraph() {
    this.hidePrimitive("graph");
  }
  removeGrid() {
    this.hidePrimitive("grid");
  }
  get viewer() {
    return this.$map.viewer;
  }
  toJSON() {
    const { options, path, stats } = this;
    return { options, path, stats };
  }
}

export default Results;
