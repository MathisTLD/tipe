function toRad(x) {
  return (x * Math.PI) / 180;
}
exports.toRad = toRad;

function distance(loc1, loc2) {
  const { lat: lat1, lon: lon1 } = loc1;
  const { lat: lat2, lon: lon2 } = loc2;
  const R = 6371000; // m
  const x1 = lat2 - lat1;
  const dLat = toRad(x1);
  const x2 = lon2 - lon1;
  const dLon = toRad(x2);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
exports.distance = distance;
