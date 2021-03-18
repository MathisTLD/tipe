const fs = require("fs-extra");
const path = require("path");
const lowdb = require("lowdb");
const FileAsync = require("lowdb/adapters/FileAsync");

module.exports = {
  // mandatory
  install() {},
  app: {
    created() {
      fs.ensureDirSync(this.resolvePath("#data"));
      const adapter = new FileAsync(
        path.resolve(this.resolvePath("#data"), "db.json"),
        {
          defaultValue: { locations: [] },
        }
      );
      // db is a promise here
      this.db = lowdb(adapter);
    },
  },
};
