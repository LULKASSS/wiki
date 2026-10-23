/* Gemeinsame Bausteine der Skripte: Pfade, Lesen, die Seite mit Ziel oder Daten bauen. */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const SRC = ROOT + 'src/wiki.html';
export const lies = f => readFileSync(f, 'utf8');

/* Ziel für das Konto (Supabase-Adresse und öffentlicher Schlüssel) – dasselbe wie bei Klar. */
export const ZIEL = existsSync(ROOT + 'wolke.json') ? JSON.parse(lies(ROOT + 'wolke.json')) : null;

const ANKER = '<script>\n  function wikiProgramm';
const json = x => JSON.stringify(x).replace(/</g, '\\u003c');

/* Seite mit Konto: das Ziel steht als #wolkeziel vor dem Programm. */
export function mitZiel(code, ziel) {
  if (!code.includes(ANKER)) throw new Error('src/wiki.html: Einfügestelle vor wikiProgramm fehlt');
  return code.replace(ANKER, () => '<script type="application/json" id="wolkeziel">' + json({ url: ziel.url, key: ziel.key }) + '</script>\n' + ANKER);
}

/* Seite mit eingebetteten Daten (Entwicklung, Vorschau) – ohne Konto. */
export function mitDaten(code, baum, ergaenzenText = null, vorher = null) {
  if (!code.includes(ANKER)) throw new Error('src/wiki.html: Einfügestelle vor wikiProgramm fehlt');
  const erg = ergaenzenText === null ? 'null' : `function () { return Promise.resolve(${JSON.stringify(ergaenzenText)}); }`;
  return code.replace(ANKER, () => `<script>\nwindow.WIKI_DATEN = { baum: ${json(baum)}, vorher: ${vorher ? json(vorher) : 'null'}, wartend: 0, ergaenzen: ${erg} };\n</script>\n` + ANKER);
}

export const ICONS = ['wiki-192.png', 'wiki-512.png', 'wiki-maske-512.png'];
export const MANIFEST = JSON.stringify({
  name: 'Persönliches Wiki', short_name: 'Wiki', lang: 'de', start_url: './', scope: './', display: 'standalone',
  background_color: '#f0f0f2', theme_color: '#6a52a3',
  icons: [
    { src: 'wiki-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'wiki-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'wiki-maske-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}, null, 1);
