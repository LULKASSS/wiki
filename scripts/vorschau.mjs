/* Vorschau mit echten Daten für ein privates claude.ai-Artifact – nie ins Repo.
 * Aufruf: node scripts/vorschau.mjs <wiki.json> <ausgabe.html>
 * <wiki.json> ist das Wiki selbst oder {baum: "<JSON-Text>"} wie in der Datenbank.
 * Ohne <html>/<head>/<body>-Gerüst, ohne Manifest und Icons: das Artifact bringt sein Gerüst mit. */
import { writeFileSync } from 'node:fs';
import { SRC, mitDaten, lies } from './teile.mjs';

const [datenPfad, ausgabe] = process.argv.slice(2);
if (!datenPfad || !ausgabe) { console.error('Aufruf: node scripts/vorschau.mjs <wiki.json> <ausgabe.html>'); process.exit(1); }
let baum = JSON.parse(lies(datenPfad));
if (baum.baum !== undefined) baum = typeof baum.baum === 'string' ? JSON.parse(baum.baum) : baum.baum;
let html = mitDaten(lies(SRC), baum, 'Vorschau: hier wird noch nichts gespeichert.');
html = html.replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n/g, '')
  .replace(/^<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport"[^>]*>\n/, '')
  .replace('</style>\n</head>\n<body>\n', '</style>\n').replace(/\n<\/body>\n<\/html>\n$/, '\n');
writeFileSync(ausgabe, html);
console.log('Vorschau:', ausgabe);
