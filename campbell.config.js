const path = require("path");
const fs = require("fs-extra");

module.exports = {
  presets: [require("@campbell/vueapps/build/preset")],
  plugins: [
    // binaries
    {
      hooks: {
        async build(builder) {
          const BIN_DIR = builder.resolvePath(["#output", "bin"]);
          await fs.ensureDir(BIN_DIR);
          // calculator
          await require("./lib/flight-calculator/compile")(BIN_DIR);
        },
      },
    },
    // copy .env
    // FIXME: should only use this in dev mode
    {
      hooks: {
        async build(builder) {
          const src = path.resolve(__dirname, ".env");
          if (await fs.pathExists(src)) {
            const dest = path.resolve(builder.resolvePath("#output"), ".env");
            await fs.remove(dest);
            await fs.copy(src, dest);
          }
        },
      },
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
