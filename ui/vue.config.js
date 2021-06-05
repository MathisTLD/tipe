const path = require("path");

module.exports = {
  transpileDependencies: ["vuetify"],
  chainWebpack: (cfg) => {
    // cesium (https://cesium.com/docs/tutorials/cesium-and-webpack/)
    const CopywebpackPlugin = require("copy-webpack-plugin");
    const cesiumSource = path.resolve(__dirname, "node_modules/cesium/Source");
    cfg.resolve.alias.set("cesium", cesiumSource);
    // https://github.com/CesiumGS/cesium/issues/8471
    cfg.module.set("unknownContextCritical", false);
    // Needed to compile multiline strings in Cesium
    cfg.output.sourcePrefix("");
    // Enable webpack-friendly use of require in Cesium
    cfg.node.set("fs", "empty");
    // Copy Cesium Assets, Widgets, and Workers to a static directory
    cfg.plugin("CopyCesium").use(CopywebpackPlugin, [
      {
        patterns: [
          {
            from: path.resolve(cesiumSource, "../Build/Cesium/Workers"),
            to: "Workers",
          },
          { from: path.resolve(cesiumSource, "Assets"), to: "Assets" },
          { from: path.resolve(cesiumSource, "Widgets"), to: "Widgets" },
        ],
      },
    ]);
  },
};
