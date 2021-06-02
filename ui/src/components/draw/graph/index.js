import * as Cesium from "cesium/Cesium";

import gradient from "./gradient";

export function displayGraph(results) {
  const { plan } = results;
  const min = plan.path[0].date;
  const max = plan.path[plan.path.length - 1].date;
  const span = max - min;
  const points = this.viewer.scene.primitives.add(
    new Cesium.PointPrimitiveCollection()
  );
  plan.graph.forEach(({ loc, date }) => {
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
