import * as Cesium from "cesium/Cesium";
window.Cesium = Cesium;

function cleanup() {
  this.viewer.entities.removeAll();
}

function setView(plan) {
  let { departure, arrival } = plan.options;
  this.viewer.camera.setView({
    destination: new Cesium.Cartesian3.fromDegrees(
      (departure.lon + arrival.lon) / 2,
      (departure.lat + arrival.lat) / 2,
      8000000
    )
  });
}

// TODO: make heatmaps work or delete them
window.h337 = require("../../vendors/heatmap.js");
// require("cesium-heatmap");
// const CesiumHeatmap = window.CesiumHeatmap;

function display(results) {
  const { plan, options } = results;
  this.results.push(results);
  console.log(results);
  setView.call(this, plan);
  const coordinates = plan.path
    .map(({ loc }) => {
      return [loc.lon, loc.lat, loc.alt];
    })
    .flat();
  this.viewer.entities.add({
    polyline: {
      positions: new Cesium.Cartesian3.fromDegreesArrayHeights(coordinates),
      material: new Cesium.Color.fromCssColorString(options.color),
      width: 3
    }
  });
  // if (this.__heatmap && this.__heatmap.destroy) this.__heatmap.destroy();
  // this.__heatmap = CesiumHeatmap.create(
  //   this.viewer, // your cesium viewer
  //   {
  //     west: 180,
  //     east: -180,
  //     south: -90,
  //     north: 90
  //   }, // bounds for heatmap layer
  //   {
  //     // heatmap.js options go here
  //     // maxOpacity: 0.3
  //   }
  // );
  // this.__heatmap.setWGS84Data(
  //   plan.path[0].date,
  //   plan.path[plan.path.length - 1].date,
  //   plan.graph
  //     .filter(() => Math.random() < 0.1)
  //     .map(({ loc, date }) => ({
  //       x: loc.lon,
  //       y: loc.lat,
  //       value: date
  //     }))
  // );
}

// function displayGraph(itinerary) {
//   let { results } = itinerary;
//
//   let displayNodes = () => {
//     let nodes = results.graph.nodes;
//     nodes.forEach(node => {
//       let text = `${node.location.x}/${node.location.y} - ${
//         node.cost != undefined ? `${node.cost.toFixed()} km` : "x"
//       }`;
//       // unprocessed: Cesium.Color.CRIMSON,
//       // forbidden: Cesium.Color.ORANGERED,
//       // navigable: Cesium.Color.LIGHTBLUE,
//       // special: Cesium.Color.LIGHTGREEN
//       // color
//       let color = node.location.navigable
//         ? Cesium.Color.LIGHTBLUE
//         : Cesium.Color.ORANGERED;
//
//       let entityOptions = {
//         position: new Cesium.Cartesian3.fromDegrees(
//           node.location.lon,
//           node.location.lat
//         ),
//         label: new Cesium.LabelGraphics({
//           text,
//           showBackground: true,
//           pixelOffset: new Cesium.Cartesian2(0, -10),
//           distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2e6),
//           scale: 0.5,
//           show: true
//         }),
//         point: new Cesium.PointGraphics({
//           color,
//           pixelSize: 10,
//           show: true,
//           scaleByDistance: new Cesium.NearFarScalar(10e3, 1, 10e6, 0.5)
//         })
//       };
//       this.viewer.entities.add(entityOptions);
//     });
//   };
//   let displayEdges = () => {
//     let nodes = {};
//     results.graph.nodes.forEach(node => (nodes[node.id] = node));
//     results.graph.nodes.forEach(node => {
//       if (node.score != undefined) {
//         node.edges.forEach(edge => {
//           let from = node.location;
//           let to = nodes[edge.to].location;
//           let arr = [from, to]
//             .map(({ location: { lat, lon } }) => [lon, lat])
//             .flat();
//           let t = 1 / 5;
//           this.viewer.entities.add({
//             position: new Cesium.Cartesian3.fromDegrees(
//               t * from.location.lon + (1 - t) * to.location.lon,
//               t * from.location.lat + (1 - t) * to.location.lat
//             ),
//             label: new Cesium.LabelGraphics({
//               text: edge.score.toFixed(4),
//               distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
//                 0,
//                 2e6
//               ),
//               scale: 0.4,
//               showBackground: true
//             })
//           });
//           this.viewer.entities.add({
//             polyline: {
//               positions: new Cesium.Cartesian3.fromDegreesArray(arr),
//               material: new Cesium.Color(0, 1, 0, 0.5),
//               distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
//                 0,
//                 2e6
//               )
//             }
//           });
//         });
//       }
//     });
//   };
//
//   displayNodes();
//   displayGraph();
// }

export default {
  methods: {
    cleanup,
    display
  }
};
