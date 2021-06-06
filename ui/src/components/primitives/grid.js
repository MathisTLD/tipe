import * as Cesium from "cesium/Cesium";

const DEFAULT_COLOR = Cesium.Color.fromCssColorString("white");

const N_STEPS = 1000;

export function grid(
  n,
  altitude = 0,
  color = DEFAULT_COLOR,
  width = 1,
  quarter = false
) {
  const d = 180 / n;
  const mi = quarter ? n / 2 + 1 : n;
  const polylines = new Cesium.PolylineCollection();
  const material = Cesium.Material.fromType("Color", { color });
  function meridian(longitude) {
    const coords = [];
    const d = (quarter ? 90 : 180) / N_STEPS;
    for (let i = 0; i < N_STEPS; i++) {
      coords.push(longitude, 90 - i * d, altitude);
    }
    polylines.add({
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(coords),
      material,
      width
    });
  }

  function parallel(latitude) {
    const coords = [];
    const d = (quarter ? 90 : 360) / N_STEPS;
    for (let i = 0; i < N_STEPS; i++) {
      coords.push(i * d - 180, latitude, altitude);
    }
    polylines.add({
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(coords),
      material,
      width
    });
  }

  for (let i = 1; i < mi; i++) {
    parallel(90 - i * d);
  }
  const mj = quarter ? n / 2 + 1 : 2 * n;
  for (let j = 0; j < mj; j++) {
    meridian(j * d);
  }

  return polylines;
}
