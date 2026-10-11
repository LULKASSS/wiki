// Baut die Seite für GitHub Pages: src/ → _site/, wiki.html wird index.html.
const fs = require("fs");
const path = require("path");

const quelle = path.join(__dirname, "..", "src");
const ziel = path.join(__dirname, "..", "_site");
fs.rmSync(ziel, { recursive: true, force: true });
fs.mkdirSync(ziel);
for (const datei of fs.readdirSync(quelle)) {
  fs.copyFileSync(path.join(quelle, datei), path.join(ziel, datei === "wiki.html" ? "index.html" : datei));
}
console.log("gebaut:", fs.readdirSync(ziel).join(", "));
