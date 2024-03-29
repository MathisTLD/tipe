import * as Cesium from "cesium/Cesium";

function pgcd(x, y) {
  if (y === 0) return x;
  else {
    const z = x % y;
    return pgcd(y, z);
  }
}

export function directions(gridQ, set = 3, base_loc) {
  const heights = [0]; // [0, 100000, 200000];
  const gridIncrement = 180 / gridQ;
  let directions = [];
  for (let i = -set; i <= set; i++) {
    directions.push([set, i], [-set, i]);
    if (Math.abs(i) !== set) {
      directions.push([i, set], [i, -set]);
    }
  }
  directions = directions
    .map(dir => {
      const p = pgcd(...dir.map(Math.abs));
      return dir.map(x => Math.round(x / p));
    })
    .map(dir => heights.map((_, z) => [...dir, z]))
    .flat();
  const locFromPoint = point => {
    return {
      lat: 90 - point[0] * gridIncrement,
      lon: point[1] * gridIncrement,
      alt: heights[point[2] || 0]
    };
  };
  const pointFromLoc = loc => {
    return [
      ...[90 - loc.lat, loc.lon >= 0 ? loc.lon : 180 + loc.lon].map(x =>
        Math.round(x / gridIncrement)
      ),
      1
    ];
  };
  const point = pointFromLoc(base_loc);
  const loc_from = locFromPoint(point);
  const i = point[0],
    j = point[1],
    k = point[3] || 0;

  const polylines = new Cesium.PolylineCollection();
  directions.forEach(d => {
    const point = [i + d[0], j + d[1], k + (d[2] || 0)];
    const loc_to = locFromPoint(point);
    return polylines.add({
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        loc_from.lon,
        loc_from.lat,
        loc_from.alt,
        loc_to.lon,
        loc_to.lat,
        loc_to.alt
      ]),
      arcType: Cesium.ArcType.RHUMB,
      width: 5,
      material: Cesium.Color.fromCssColorString("#222222")
    });
  });
  polylines.loc_from = loc_from; // add loc_from as meta
  return polylines;
}
