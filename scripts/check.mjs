/* Schneller Fehlercheck ohne Browser (wie bei Klar):
 * 1. JavaScript in src/wiki.html ist syntaktisch gültig, Pflichtteile sind da
 * 2. Keine Wiki-Inhalte im Repo: keine Datendateien, kein Text aus dem echten Wiki
 *    (Abgleich gegen daten/wiki.json, falls lokal vorhanden – der Ordner ist ignoriert)
 * 3. In wolke.json steht nur der öffentliche Schlüssel
 * Exit-Code 1 bei Fehlern. */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import vm from 'node:vm';
import { ROOT, SRC, lies } from './teile.mjs';

const errors = [], warns = [];
const code = lies(SRC);

/* 1. Syntax und Pflichtteile */
const scripts = [...code.matchAll(/<script(?![^>]*\b(src=|type="application\/json"))[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[2]);
if (!scripts.length) errors.push('src/wiki.html: kein <script> gefunden');
scripts.forEach((s, i) => { try { new vm.Script(s, { filename: `wiki.html <script #${i + 1}>` }); } catch (e) { errors.push(`Syntaxfehler in Script ${i + 1}: ${e.message}`); } });
for (const need of ['<!doctype html>', '<meta charset', 'name="viewport"', '<title>Persönliches Wiki</title>', 'function wikiProgramm', 'storageKey: "klar.anmeldung"', 'rel="manifest"'])
  if (!code.includes(need)) errors.push(`src/wiki.html: ${need} fehlt`);
if (/id="daten"/.test(code)) errors.push('src/wiki.html: eingebettete Daten (#daten) gehören nicht in den Code');

/* 2. Daten */
let files = [];
try { files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean); }
catch { warns.push('git nicht verfügbar, Dateicheck übersprungen'); }
for (const f of files) {
  if (/^(daten|vorschau|public)\//.test(f)) errors.push(`Datenordner im Repo: ${f}`);
  if (/\.json$/.test(f) && !/^(package(-lock)?\.json|test\/beispiel\.json|wolke\.json)$/.test(f)) {
    if (/"artikel"\s*:/.test(lies(ROOT + f))) errors.push(`Sieht nach Wiki-Daten aus: ${f}`);
  }
  /* Die Prüfung selbst trägt die Suchmuster – sie wird ausgelassen. */
  if (/\.(js|mjs|html|md|json)$/.test(f) && !['package-lock.json', 'scripts/check.mjs'].includes(f)) {
    if (/gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-ant-[A-Za-z0-9-]{20,}|sb_secret_[A-Za-z0-9_-]{10,}/.test(lies(ROOT + f))) errors.push(`Möglicher Zugangsschlüssel in ${f}`);
  }
}
if (existsSync(ROOT + 'daten/wiki.json')) {
  let b = JSON.parse(lies(ROOT + 'daten/wiki.json'));
  if (b.baum !== undefined) b = typeof b.baum === 'string' ? JSON.parse(b.baum) : b.baum;
  const geheim = new Set();
  for (const a of b.artikel || []) { geheim.add(a.wann); for (const x of a.abschnitte || []) [...(x.schritte || []), ...(x.hinweise || []), x.intro].forEach(t => geheim.add(t)); }
  for (const w of [...(b.wissen || []), ...(b.werkzeuge || [])]) { geheim.add(w.kurz); (w.punkte || []).forEach(t => geheim.add(t)); for (const x of w.abschnitte || []) (x.punkte || []).forEach(t => geheim.add(t)); }
  const pruefen = [code, ...files.filter(f => /\.(js|mjs|md|json)$/.test(f) && f !== 'package-lock.json').map(f => lies(ROOT + f))].join('\n');
  for (const g of geheim) if (g && g.trim().length >= 20 && pruefen.includes(g.trim())) errors.push(`Text aus dem Wiki steht im Code: „${g.trim().slice(0, 40)}…“`);
} else warns.push('daten/wiki.json fehlt – Abgleich mit dem echten Wiki übersprungen');

/* 3. Nur der öffentliche Schlüssel */
if (existsSync(ROOT + 'wolke.json')) {
  let w = null;
  try { w = JSON.parse(lies(ROOT + 'wolke.json')); } catch { errors.push('wolke.json ist kein gültiges JSON'); }
  if (w) {
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(w.url || '')) errors.push('wolke.json: url muss https://….supabase.co sein');
    const k = String(w.key || '');
    let rolle = '';
    try { rolle = JSON.parse(Buffer.from(k.split('.')[1], 'base64url').toString()).role || ''; } catch {}
    if (/^sb_secret_/.test(k) || rolle === 'service_role') errors.push('wolke.json enthält den GEHEIMEN Schlüssel – nur den öffentlichen (anon / publishable) eintragen');
    else if (!/^sb_publishable_/.test(k) && rolle !== 'anon') errors.push('wolke.json: key sieht nicht nach dem öffentlichen Supabase-Schlüssel aus');
  }
} else errors.push('wolke.json fehlt');

for (const w of warns) console.log('⚠️  ' + w);
if (errors.length) { console.log('❌ Fehlercheck fehlgeschlagen:'); for (const e of errors) console.log('   • ' + e); process.exit(1); }
console.log(`✅ Fehlercheck ok (${scripts.length} Scripts, ${files.length} Dateien geprüft)`);
