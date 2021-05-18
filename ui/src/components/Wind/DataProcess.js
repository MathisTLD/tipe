import * as Cesium from "cesium/Cesium";

import axios from "axios";

var DataProcess = (function() {
  var data;

  var loadJSON = function(url) {
    return axios.get(url).then(res => {
      data = {};

      const [u, v] = res.data;

      data.lon = {};
      data.lon.min = u.longitudeOfFirstGridPointInDegrees;
      data.lon.max = u.longitudeOfLastGridPointInDegrees;
      data.lon.array = [];
      for (var i = 0; i < u.Ni; i++) {
        data.lon.array.push(data.lon.min + i * u.iDirectionIncrementInDegrees);
      }
      data.lon.array = new Float32Array(data.lon.array);

      data.lat = {};
      data.lat.min = u.latitudeOfFirstGridPointInDegrees;
      data.lat.max = u.latitudeOfLastGridPointInDegrees;
      data.lat.array = [];
      for (var j = 0; j < u.Nj; j++) {
        data.lat.array.push(data.lat.min + j * u.jDirectionIncrementInDegrees);
      }
      data.lat.array = new Float32Array(data.lat.array);

      data.lev = {};
      const lev = (1 - Math.pow(900 / 1013.25, 0.190284)) * 145366.45 * 0.3048; // convert pressure-altitude to latitude in metters
      data.lev.array = new Float32Array([lev]);
      data.lev.min = lev;
      data.lev.max = lev;

      data.dimensions = {};
      data.dimensions.lon = data["lon"].array.length;
      data.dimensions.lat = data["lat"].array.length;
      data.dimensions.lev = data["lev"].array.length;

      data.U = {};
      data.U.array = new Float32Array(u.values);
      data.U.min = u.minimum;
      data.U.max = u.maximum;

      data.V = {};
      data.V.array = new Float32Array(v.values);
      data.V.min = v.minimum;
      data.V.max = v.maximum;

      return data;
    });
  };
  /*
  ### How do particles get colored?
  The particles colors are defined in the `colorTable.json` file,
  and this demo uses the color table "GMT_panoply" in [NCL Graphics](https://www.ncl.ucar.edu/Document/Graphics/color_table_gallery.shtml).
  The colors in 'colorTable' are defined in the form of `[r,g,b,r,g,b,......,r,g,b]`,
  the first RGB color is for the element with minimum value, and the last color is for the maximum value.
  Colors can be interpolated.
  */

  // TODO: make this configurable
  var loadColorTable = function() {
    const colorScale = [
      "rgb(36,104,180)",
      "rgb(60,157,194)",
      "rgb(128,205,193)",
      "rgb(151,218,168)",
      "rgb(198,231,181)",
      "rgb(238,247,217)",
      "rgb(255,238,159)",
      "rgb(252,217,125)",
      "rgb(255,182,100)",
      "rgb(252,150,75)",
      "rgb(250,112,52)",
      "rgb(245,64,32)",
      "rgb(237,45,28)",
      "rgb(220,24,32)",
      "rgb(180,0,35)"
    ];
    var json = {
      colorNum: colorScale.length,
      colorTable: colorScale
        .map(str =>
          str
            .replace(/(^rgb\(|\)$)/g, "")
            .split(",")
            .map(Number)
            .map(x => x / 255)
        )
        .flat()
    };

    var colorNum = json["colorNum"];
    var colorTable = json["colorTable"];

    var colorsArray = new Float32Array(3 * colorNum);
    for (var i = 0; i < colorNum; i++) {
      colorsArray[3 * i] = colorTable[3 * i];
      colorsArray[3 * i + 1] = colorTable[3 * i + 1];
      colorsArray[3 * i + 2] = colorTable[3 * i + 2];
    }

    data.colorTable = {};
    data.colorTable.colorNum = colorNum;
    data.colorTable.array = colorsArray;
  };

  var loadData = async function() {
    await loadJSON("/api/weather/wind.json");
    loadColorTable();
    return data;
  };

  var randomizeParticles = function(maxParticles, viewerParameters) {
    var array = new Float32Array(4 * maxParticles);
    for (var i = 0; i < maxParticles; i++) {
      array[4 * i] = Cesium.Math.randomBetween(
        viewerParameters.lonRange.x,
        viewerParameters.lonRange.y
      );
      array[4 * i + 1] = Cesium.Math.randomBetween(
        viewerParameters.latRange.x,
        viewerParameters.latRange.y
      );
      array[4 * i + 2] = Cesium.Math.randomBetween(data.lev.min, data.lev.max);
      array[4 * i + 3] = 0.0;
    }
    return array;
  };

  return {
    loadData: loadData,
    randomizeParticles: randomizeParticles
  };
})();

export default DataProcess;
