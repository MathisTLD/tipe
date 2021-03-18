import _ from "lodash";

let defaultEdgesOpts = {
  polyline: {
    material: new Cesium.Color(0, 1, 0, 0.5),
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2e6),
  },
  label: {
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2e6),
    scale: 0.4,
    showBackground: true,
  },
};

function cleanup() {
  this.viewer.entities.removeAll();
}

function displayItinerary(itinerary) {
  let { props, results } = itinerary;
  setView.call(this, itinerary);
  displayRoute.call(this, itinerary);
  if (props.debug) {
    if (results.graph) displayGraph.call(this, itinerary);
  }
}

function setView(itinerary) {
  let { from, to } = itinerary.props;
  this.viewer.camera.setView({
    destination: new Cesium.Cartesian3.fromDegrees(
      (from.lon + to.lon) / 2,
      (from.lat + to.lat) / 2,
      8000000
    ),
  });
}

function displayRoute(itinerary) {
  let { results, props } = itinerary;

  let degreesArray = results.path.points
    .map(({ location }) => {
      let { lat, lon } = location;
      return [lon, lat];
    })
    .flat();
  this.viewer.entities.add({
    polyline: {
      positions: new Cesium.Cartesian3.fromDegreesArray(degreesArray),
      material: new Cesium.Color.fromCssColorString(props.color),
      width: 3,
    },
  });
}

function displayGraph(itinerary) {
  let { results } = itinerary;

  let displayNodes = () => {
    let nodes = results.graph.nodes;
    nodes.forEach((node) => {
      let text = `${node.location.x}/${node.location.y} - ${
        node.cost != undefined ? `${node.cost.toFixed()} km` : "x"
      }`;
      // unprocessed: Cesium.Color.CRIMSON,
      // forbidden: Cesium.Color.ORANGERED,
      // navigable: Cesium.Color.LIGHTBLUE,
      // special: Cesium.Color.LIGHTGREEN
      // color
      let color = node.location.navigable
        ? Cesium.Color.LIGHTBLUE
        : Cesium.Color.ORANGERED;

      let entityOptions = {
        position: new Cesium.Cartesian3.fromDegrees(
          node.location.lon,
          node.location.lat
        ),
        label: new Cesium.LabelGraphics({
          text,
          showBackground: true,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2e6),
          scale: 0.5,
          show: true,
        }),
        point: new Cesium.PointGraphics({
          color,
          pixelSize: 10,
          show: true,
          scaleByDistance: new Cesium.NearFarScalar(10e3, 1, 10e6, 0.5),
        }),
      };
      this.viewer.entities.add(entityOptions);
    });
  };
  let displayEdges = () => {
    let nodes = {};
    results.graph.nodes.forEach((node) => (nodes[node.id] = node));
    results.graph.nodes.forEach((node) => {
      if (node.score != undefined) {
        node.edges.forEach((edge) => {
          let from = node.location;
          let to = nodes[edge.to].location;
          let arr = [from, to]
            .map(({ location: { lat, lon } }) => [lon, lat])
            .flat();
          let t = 1 / 5;
          this.viewer.entities.add({
            position: new Cesium.Cartesian3.fromDegrees(
              t * from.location.lon + (1 - t) * to.location.lon,
              t * from.location.lat + (1 - t) * to.location.lat
            ),
            label: new Cesium.LabelGraphics({
              text: edge.score.toFixed(4),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                0,
                2e6
              ),
              scale: 0.4,
              showBackground: true,
            }),
          });
          this.viewer.entities.add({
            polyline: {
              positions: new Cesium.Cartesian3.fromDegreesArray(arr),
              material: new Cesium.Color(0, 1, 0, 0.5),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                0,
                2e6
              ),
            },
          });
        });
      }
    });
  };

  displayNodes();
  displayGraph();
}

export default {
  methods: {
    cleanup,
    displayItinerary,
  },
};
