/* Baut den Neuentwurf (entwurf/wiki-neu.html) mit Daten – für ein privates Artifact oder zum Ansehen im Browser.
 * Aufruf: node scripts/entwurf.mjs <wiki.json> [<vorher.json>] <ausgabe.html> [--seite]
 * <vorher.json> ist eine ältere Fassung; der Entwurf zeigt, was seitdem neu ist. --seite baut ein ganzes Dokument
 * (doctype, viewport) statt des Artifact-Inhalts. Mit echten Daten nie ins Repo. */
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const seite = args.includes('--seite');
const pfade = args.filter((a) => a !== '--seite');
const [daten, vorher, ausgabe] = pfade.length === 3 ? pfade : [pfade[0], null, pfade[1]];
if (!daten || !ausgabe) { console.error('Aufruf: node scripts/entwurf.mjs <wiki.json> [<vorher.json>] <ausgabe.html> [--seite]'); process.exit(1); }

const lies = (p) => { let b = JSON.parse(readFileSync(p, 'utf8')); if (b.baum !== undefined) b = typeof b.baum === 'string' ? JSON.parse(b.baum) : b.baum; return b; };
// </script> im Text darf das Skript-Element nicht beenden
const alsSkript = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

const quelle = readFileSync(new URL('../entwurf/wiki-neu.html', import.meta.url), 'utf8');
let html = quelle.replace('/*DATEN*/null', alsSkript(lies(daten)));

// Die alte Fassung verdichtet die Seite selbst auf Titel und Prüfsumme je Abschnitt.
html = html.replace('/*VORHER*/null', vorher ? alsSkript(lies(vorher)) : 'null');

if (seite) html = '<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head>\n<body>\n' + html + '\n</body>\n</html>\n';
writeFileSync(ausgabe, html);
console.log('Entwurf:', ausgabe);
