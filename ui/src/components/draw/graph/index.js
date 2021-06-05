import * as Cesium from "cesium/Cesium";

import gradient from "./gradient";

export function displayGraph(results) {
  if (!results.stats.graph) throw new Error("no grpah data provided");
  const min = results.path[0].date;
  const max = results.path[results.path.length - 1].date;
  const span = max - min;
  const points = this.viewer.scene.primitives.add(
    new Cesium.PointPrimitiveCollection()
  );
  results.stats.graph.forEach(({ loc, date }) => {
    const cost = (date - min) / span;
    const color = Cesium.Color.fromCssColorString(
      gradient.rgbAt(cost > 1 ? 1 : cost).toRgbString()
    );
    points.add({
      position: Cesium.Cartesian3.fromDegrees(loc.lon, loc.lat),
      pixelSize: 1,
      color
    });
  });
}
