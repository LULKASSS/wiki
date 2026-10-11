// Kleiner Server für die Tests: liefert src/ aus, / ist wiki.html.
const http = require("http");
const fs = require("fs");
const path = require("path");

const wurzel = path.join(__dirname, "..", "src");
const ARTEN = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json", ".js": "text/javascript" };
const port = Number(process.env.PORT || 4174);

http.createServer((anfrage, antwort) => {
  let pfad = decodeURIComponent(anfrage.url.split("?")[0]);
  if (pfad === "/" || pfad === "/index.html") pfad = "/wiki.html";
  const datei = path.join(wurzel, path.normalize(pfad));
  if (!datei.startsWith(wurzel) || !fs.existsSync(datei)) { antwort.writeHead(404); antwort.end(); return; }
  antwort.writeHead(200, { "Content-Type": ARTEN[path.extname(datei)] || "application/octet-stream" });
  fs.createReadStream(datei).pipe(antwort);
}).listen(port, () => console.log(`Wiki auf http://localhost:${port}`));
