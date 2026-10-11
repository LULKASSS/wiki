/* src/wiki.html → Seite für GitHub Pages, mit Konto (Ziel aus wolke.json), ohne Inhalte.
 * Aufruf: node scripts/oeffentlich.mjs [ausgabe.html]   (Standard: public/index.html) */
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ROOT, SRC, ZIEL, ICONS, MANIFEST, mitZiel, lies } from './teile.mjs';

if (!ZIEL) throw new Error('wolke.json fehlt');
const aus = process.argv[2] || ROOT + 'public/index.html';
const html = mitZiel(lies(SRC), ZIEL);
mkdirSync(dirname(aus), { recursive: true });
writeFileSync(aus, html);
writeFileSync(dirname(aus) + '/manifest.webmanifest', MANIFEST);
for (const f of ICONS) copyFileSync(ROOT + 'icon/' + f, dirname(aus) + '/' + f);
console.log(`✅ ${aus} gebaut (${(html.length / 1024).toFixed(0)} KB, ohne Inhalte)`);
