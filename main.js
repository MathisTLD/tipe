const Campbell = require("campbell");

Campbell.logger.transports[0].level =
  process.env.NODE_ENV === "development" ? "debug" : "info";

Campbell.appConfig.extendSchema({
  googleApiKey: {
    format: "string",
    default: null,
    env: "GOOGLE_API_KEY",
  },
  dir: {
    data: {
      format: "string",
      default: "./data",
      env: "DATA_DIR",
    },
    bin: {
      format: "string",
      default: "./bin",
      env: "BIN_DIR",
    },
  },
});

Campbell.use(require("./lib/db"));
Campbell.use(require("./lib/weather"));
Campbell.use(require("./lib/flight-calculator"));

const App = Campbell.getComponent("App");
const app = new App({});

app.$mount().then(() => {
  app.start();
});
