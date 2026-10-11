/* Lokaler Server: http://localhost:5192
 * /                 mit dem erfundenen Wiki aus test/beispiel.json, ohne Konto
 * /konto?wolke=test gegen den nachgebauten Speicher aus test/konto.spec.js
 * /konto?wolke=echt gegen das echte Projekt aus wolke.json
 * /leer             ohne Daten und ohne Konto
 * Echte Wiki-Inhalte kommen hier nie hinein. */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { ROOT, SRC, ZIEL, ICONS, MANIFEST, mitZiel, mitDaten, lies } from './teile.mjs';

const port = +(process.env.PORT || 5192);
createServer((req, res) => {
  const { pathname, searchParams } = new URL(req.url, 'http://x');
  const datei = pathname.split('/').pop();
  if (datei === 'manifest.webmanifest') { res.writeHead(200, { 'content-type': 'application/manifest+json' }).end(MANIFEST); return; }
  if (ICONS.includes(datei)) { res.writeHead(200, { 'content-type': 'image/png' }).end(readFileSync(ROOT + 'icon/' + datei)); return; }
  try {
    const code = lies(SRC);
    let html;
    if (pathname === '/' || pathname === '/index.html') html = mitDaten(code, JSON.parse(lies(ROOT + 'test/beispiel.json')), 'Nur Beispiel – hier wird nichts gespeichert.');
    else if (pathname === '/leer') html = code;
    else if (pathname === '/konto') {
      const w = searchParams.get('wolke');
      const ziel = w === 'echt' ? ZIEL : { url: 'https://test.invalid', key: 'test' };
      html = mitZiel(code, ziel);
    } else { res.writeHead(404).end('nicht gefunden'); return; }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(html);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
}).listen(port, '127.0.0.1', () => console.log(`Wiki läuft auf http://localhost:${port}`));
