const path = require("path");
const fs = require("fs-extra");

module.exports = {
  presets: [
    require("@campbell/vueapps/build/preset"),
    function copyDotEnv() {
      this.hooks["build"].tapPromise("CopyDotEnv", async () => {
        const src = path.resolve(__dirname, ".env");
        if (await fs.pathExists(src)) {
          await fs.copy(src, path.resolve(this.resolvePath("#output"), ".env"));
        }
      });
    },
    function compileCalculator() {
      const compile = async () =>
        await require("./lib/flight-calculator/compile")(
          this.resolvePath(["#output"])
        );
      this.hooks["build"].tapPromise("CompileCalculator", compile);
    },
  ],
  vueapps: {
    apps: [
      {
        src: path.resolve(__dirname, "./ui"),
        route: "/",
      },
    ],
  },
};
