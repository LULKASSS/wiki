// Baut eine Vorschau-Datei mit eingebetteten Daten – nur für die Artifact-Vorschau,
// nie ins Repo (die echten Inhalte sind privat). Aufruf:
//   node scripts/vorschau.js <wiki.json> <ausgabe.html>
//   node scripts/vorschau.js <wiki.json> <ausgabe.html> --artifact   (ohne <html>/<head>/<body>-Gerüst)
// <wiki.json> ist entweder das Wiki selbst oder {baum: "<JSON-Text>"} wie in der Datenbank.
const fs = require("fs");
const path = require("path");

const [datenPfad, ausgabe, wahl] = process.argv.slice(2);
if (!datenPfad || !ausgabe) { console.error("Aufruf: node scripts/vorschau.js <wiki.json> <ausgabe.html>"); process.exit(1); }
let baum = JSON.parse(fs.readFileSync(datenPfad, "utf8"));
if (baum.baum) baum = typeof baum.baum === "string" ? JSON.parse(baum.baum) : baum.baum;

let html = fs.readFileSync(path.join(__dirname, "..", "src", "wiki.html"), "utf8");
// Manifest und Icons gibt es in der Vorschau nicht – sonst 404 auf der Konsole.
html = html.replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n/g, "");
const json = JSON.stringify(baum).replace(/</g, "\\u003c");
const vorgabe = `<script>
window.WIKI_DATEN = {
  baum: ${json},
  wartend: 0,
  ergaenzen: function () { return Promise.resolve("Vorschau: hier wird noch nichts gespeichert."); }
};
</script>
`;
html = html.replace("<script>\n  function wikiProgramm", vorgabe + "<script>\n  function wikiProgramm");
if (!html.includes("window.WIKI_DATEN = {")) { console.error("Einfügestelle nicht gefunden"); process.exit(1); }
if (wahl === "--artifact") {
  // Ein claude.ai-Artifact bekommt sein Gerüst beim Veröffentlichen selbst.
  html = html.replace(/^<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport"[^>]*>\n/, "")
    .replace("</style>\n</head>\n<body>\n", "</style>\n").replace(/\n<\/body>\n<\/html>\n$/, "\n");
}
fs.writeFileSync(ausgabe, html);
console.log("Vorschau:", ausgabe);
