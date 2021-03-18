const path = require("path");
const { exec } = require("child_process");

function run(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, opts, (err, stdout, stderr) => {
      if (err) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function compile(out, srcDir = path.resolve(__dirname, "calculator")) {
  let OUTPUT_DIR = out;
  if (OUTPUT_DIR[OUTPUT_DIR.length - 1] !== path.sep) OUTPUT_DIR += "/";
  console.log("compiling calculator...");
  const ctx = {
    cwd: srcDir,
    env: {
      ...process.env,
      OUTPUT_DIR,
    },
  };
  await run("make clean", ctx);
  await run("make", ctx);
  console.log("calculator compiled");
}
module.exports = compile;
