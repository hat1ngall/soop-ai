const fs = require("node:fs");
const path = require("node:path");
const { buildSync } = require("esbuild");

const target = path.join(__dirname, "dist");
fs.mkdirSync(target, { recursive: true });
for (const name of ["index.html", "style.css"]) {
  fs.copyFileSync(path.join(__dirname, "ui", name), path.join(target, name));
}
const publicDir = path.join(__dirname, "..", "public");
fs.mkdirSync(path.join(target, "models"), { recursive: true });
fs.copyFileSync(path.join(publicDir, "logo.svg"), path.join(target, "logo.svg"));
for (const name of fs.readdirSync(path.join(publicDir, "models"))) {
  fs.copyFileSync(path.join(publicDir, "models", name), path.join(target, "models", name));
}
buildSync({
  entryPoints: [path.join(__dirname, "ui", "app.js")],
  outfile: path.join(target, "app.js"),
  nodePaths: [path.join(__dirname, "node_modules")],
  bundle: true,
  target: "chrome140",
  define: { "process.env.NODE_ENV": '"production"' },
});
