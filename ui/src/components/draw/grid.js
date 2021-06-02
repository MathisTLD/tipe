import * as Cesium from "cesium/Cesium";

const DEFAULT_MATERIAL = Cesium.Color.fromCssColorString("white");

export function displayGrid(
  n,
  altitude = 0,
  material = DEFAULT_MATERIAL,
  width = 1,
  quarter = false
) {
  const d = 180 / n;
  const mi = quarter ? n / 2 + 1 : n;
  for (let i = 1; i < mi; i++) {
    parallel.call(this, 90 - i * d, altitude, material, width, quarter);
  }
  const mj = quarter ? n / 2 + 1 : 2 * n;
  for (let j = 0; j < mj; j++) {
    meridian.call(this, j * d, altitude, material, width, quarter);
  }
}

function meridian(
  longitude,
  altitude = 0,
  material = DEFAULT_MATERIAL,
  width = 2,
  half = false
) {
  const name = "Meridian " + longitude;
  return this.viewer.entities.add({
    name: name,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(
        !half
          ? [
              longitude,
              90,
              altitude,
              longitude,
              0,
              altitude,
              longitude,
              -90,
              altitude
            ]
          : [longitude, 90, altitude, longitude, 0, altitude]
      ),
      arcType: Cesium.ArcType.RHUMB,
      material,
      width
    }
  });
}

function parallel(
  latitude,
  altitude = 0,
  material = DEFAULT_MATERIAL,
  width = 2,
  quarter = 0
) {
  const name = "Parallel " + latitude;
  return this.viewer.entities.add({
    name: name,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(
        !quarter
          ? [
              -180,
              latitude,
              altitude,
              -90,
              latitude,
              altitude,
              0,
              latitude,
              altitude,
              90,
              latitude,
              altitude,
              180,
              latitude,
              altitude
            ]
          : [0, latitude, altitude, 90, latitude, altitude]
      ),
      arcType: Cesium.ArcType.RHUMB,
      material,
      width
    }
  });
}
