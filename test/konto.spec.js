// Konto, Laden und Einmal-Übernahme. Supabase wird hier nachgebaut wie in Klars
// test/wolke.spec.js: ein gemeinsamer Speicher im Testprozess, an den sich die Browser hängen.
// Geprüft wird die Logik des Wikis, nicht Supabase selbst.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const BEISPIEL_PFAD = new URL('./beispiel.json', import.meta.url).pathname;
const BEISPIEL = JSON.parse(readFileSync(BEISPIEL_PFAD, 'utf8'));
const NUTZER = 'u-lukastestde';

function speicher() {
  const zeilen = new Map();
  const schluessel = r => `${r.user_id}|${r.sammlung}|${r.id}`;
  async function db(st) {
    const f = Object.fromEntries(st.filters);
    const passt = r => Object.entries(f).every(([k, v]) => r[k] === v);
    if (st.op === 'insert') {
      if (zeilen.has(schluessel(st.row))) return { data: null, error: { message: 'duplicate key value violates unique constraint' } };
      zeilen.set(schluessel(st.row), st.row); return { data: null, error: null };
    }
    if (st.op === 'upsert') { zeilen.set(schluessel(st.row), st.row); return { data: null, error: null }; }
    if (st.op === 'delete') { [...zeilen.values()].filter(passt).forEach(r => zeilen.delete(schluessel(r))); return { data: null, error: null }; }
    const liste = [...zeilen.values()].filter(passt);
    if (st.single) return { data: liste[0] ? { daten: liste[0].daten } : null, error: null };
    return { data: liste.map(r => ({ id: r.id, daten: r.daten })), error: null };
  }
  function auth(mail, pw) {
    if (mail !== 'lukas@test.de' || pw !== 'geheim123') return { error: { message: 'Invalid login credentials' } };
    return { user: { id: NUTZER, email: mail } };
  }
  async function kontext(browser, opts = {}) {
    const ctx = await browser.newContext(opts);
    await ctx.exposeBinding('__wikiDb', (_q, st) => db(JSON.parse(st)));
    await ctx.exposeBinding('__wikiAuth', (_q, mail, pw) => auth(mail, pw));
    await ctx.addInitScript(() => {
      function abfrage() {
        const st = { op: 'select', filters: [], single: false, row: null };
        const b = {
          select() { return b; }, insert(row) { st.op = 'insert'; st.row = row; return b; },
          upsert(row) { st.op = 'upsert'; st.row = row; return b; }, delete() { st.op = 'delete'; return b; },
          eq(k, v) { st.filters.push([k, v]); return b; }, maybeSingle() { st.single = true; return b; },
          then(ok, nein) { return window.__wikiDb(JSON.stringify(st)).then(ok, nein); }
        };
        return b;
      }
      /* Die Sitzung liegt unter demselben Schlüssel wie bei Klar – so teilen sich beide Apps die Anmeldung. */
      const sitzung = () => { try { return JSON.parse(localStorage.getItem('klar.anmeldung')); } catch { return null; } };
      const horcher = [];
      window.__wikiAuthEreignis = (ereignis, s) => horcher.forEach(cb => cb(ereignis, s));
      window.__wikiSupabase = {
        createClient: (_url, _key, opts) => {
          /* Kein Netz: die Bibliothek lässt sich nicht laden */
          if (localStorage.getItem('test.offline')) throw new Error('Failed to fetch');
          window.__wikiOptionen = opts;
          return {
            auth: {
              getSession: async () => ({ data: { session: sitzung() } }),
              onAuthStateChange: cb => { horcher.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
              signInWithPassword: async ({ email, password }) => {
                const r = await window.__wikiAuth(email, password);
                if (r.error) return { data: {}, error: r.error };
                const s = { user: r.user };
                localStorage.setItem('klar.anmeldung', JSON.stringify(s));
                return { data: { user: r.user, session: s }, error: null };
              }
            },
            from: () => abfrage()
          };
        }
      };
    });
    return ctx;
  }
  async function seite(ctx, adresse = '/konto?wolke=test') {
    const page = await ctx.newPage();
    const fehler = [];
    page.on('pageerror', e => fehler.push(e.message));
    page.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
    await page.goto(adresse);
    return { page, fehler };
  }
  function wikiAnlegen(baum = BEISPIEL) {
    zeilen.set(`${NUTZER}|wiki|aktuell`, { user_id: NUTZER, sammlung: 'wiki', id: 'aktuell', daten: { baum: JSON.stringify(baum), aktualisiert: '2026-10-11T08:00:00.000Z', fassung: baum.fassung } });
  }
  return { zeilen, kontext, seite, wikiAnlegen };
}

async function anmelden(page, pw = 'geheim123') {
  await expect(page.locator('#tor[data-ansicht="anmelden"]')).toBeVisible();
  await page.locator('#wmail').fill('lukas@test.de');
  await page.locator('#wpw').fill(pw);
  await page.locator('[data-wtu="an"]:enabled').click();
}
const angemeldet = ctx => ctx.addInitScript(() => localStorage.setItem('klar.anmeldung', JSON.stringify({ user: { id: 'u-lukastestde', email: 'lukas@test.de' } })));

test('Gleiche Anmeldung wie Klar', async ({ browser }) => {
  const s = speicher();
  const ctx = await s.kontext(browser);
  const { page } = await s.seite(ctx);
  await expect(page.locator('#tor')).toBeVisible();
  expect(await page.evaluate(() => window.__wikiOptionen.auth)).toEqual({ persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'klar.anmeldung' });
  await ctx.close();
});

test('Ohne Sitzung nur die Anmeldung, falsches Passwort wird gemeldet @mobil', async ({ browser }) => {
  const s = speicher(); s.wikiAnlegen();
  const ctx = await s.kontext(browser);
  const { page, fehler } = await s.seite(ctx);
  await expect(page.locator('#app')).toBeHidden();
  await anmelden(page, 'falsch');
  await expect(page.locator('#wmeldung')).toHaveText('E-Mail oder Passwort stimmt nicht.');
  await page.locator('#wpw').fill('geheim123');
  await page.locator('#wpw').press('Enter');
  await expect(page.locator('#tor')).toHaveCount(0);
  await expect(page.locator('#inhalt h1')).toHaveText('Deine Abläufe, als Nachschlagewerk');
  expect(fehler).toEqual([]);
  await ctx.close();
});

test('Einmal-Übernahme prüft die Datei und legt wiki/aktuell an @dunkel', async ({ browser }) => {
  const s = speicher();
  const ctx = await s.kontext(browser);
  const { page, fehler } = await s.seite(ctx);
  await anmelden(page);
  await expect(page.locator('#tor[data-ansicht="uebernahme"] h1')).toHaveText('Wiki übernehmen');
  await expect(page.locator('[data-wtu="uebernehmen"]')).toBeDisabled();

  /* Zu alt: wird abgelehnt, nichts geschrieben */
  await page.locator('#wdatei').setInputFiles({ name: 'alt.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...BEISPIEL, fassung: 10 })) });
  await expect(page.locator('#wmeldung')).toHaveText('Das Wiki hat Fassung 10. Nötig ist Fassung 11 oder neuer.');
  await expect(page.locator('[data-wtu="uebernehmen"]')).toBeDisabled();
  /* Kein Wiki */
  await page.locator('#wdatei').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"fassung": 13}') });
  await expect(page.locator('#wmeldung')).toHaveText('Das ist kein Wiki: die Liste „artikel“ fehlt.');

  await page.locator('#wdatei').setInputFiles(BEISPIEL_PFAD);
  await expect(page.locator('#wpruefung')).toHaveText('Fassung 11 vom 01.10.2026 · 3 Abläufe · 2 Fachwissen-Seiten · 2 Werkzeuge · 1 Anlass');
  expect(s.zeilen.size).toBe(0);
  await page.locator('[data-wtu="uebernehmen"]').click();
  await expect(page.locator('#inhalt h1')).toHaveText('Deine Abläufe, als Nachschlagewerk');

  const z = s.zeilen.get(`${NUTZER}|wiki|aktuell`);
  expect(z.daten.fassung).toBe(11);
  expect(JSON.parse(z.daten.baum)).toEqual(BEISPIEL);
  expect(z.daten.aktualisiert).toMatch(/^\d{4}-\d\d-\d\dT/);

  /* Danach ist der Knopf weg */
  await page.reload();
  await expect(page.locator('#inhalt h1')).toHaveText('Deine Abläufe, als Nachschlagewerk');
  await expect(page.locator('#tor')).toHaveCount(0);
  expect(fehler).toEqual([]);
  await ctx.close();
});

test('Übernahme überschreibt nie ein Wiki, das inzwischen da ist', async ({ browser }) => {
  const s = speicher();
  const ctx = await s.kontext(browser);
  const { page } = await s.seite(ctx);
  await anmelden(page);
  await page.locator('#wdatei').setInputFiles(BEISPIEL_PFAD);
  await expect(page.locator('[data-wtu="uebernehmen"]')).toBeEnabled();
  /* Währenddessen schreibt der Sonntagslauf ein Wiki */
  s.wikiAnlegen({ ...BEISPIEL, fassung: 14, aktualisiert: '2026-10-12' });
  await page.locator('[data-wtu="uebernehmen"]').click();
  await expect(page.locator('.zahlen')).toContainText('Stand 12.10.2026');
  expect(s.zeilen.get(`${NUTZER}|wiki|aktuell`).daten.fassung).toBe(14);
  await ctx.close();
});

test('Schon in Klar angemeldet: Direktlink öffnet sofort @mobil', async ({ browser }) => {
  const s = speicher(); s.wikiAnlegen();
  const ctx = await s.kontext(browser);
  await angemeldet(ctx);
  const { page, fehler } = await s.seite(ctx, '/konto?wolke=test#/artikel/vorrat-pruefen');
  await expect(page.locator('#inhalt h1')).toHaveText('Vorrat prüfen');
  await expect(page.locator('#tor')).toHaveCount(0);
  expect(fehler).toEqual([]);
  await ctx.close();
});

test('Etwas ergänzen schreibt nur in wiki-eingang', async ({ browser }) => {
  const s = speicher(); s.wikiAnlegen();
  s.zeilen.set(`${NUTZER}|wiki-eingang|alt1`, { user_id: NUTZER, sammlung: 'wiki-eingang', id: 'alt1', daten: { text: 'a', stand: 'neu' } });
  s.zeilen.set(`${NUTZER}|wiki-eingang|alt2`, { user_id: NUTZER, sammlung: 'wiki-eingang', id: 'alt2', daten: { text: 'b', stand: 'ausgewertet' } });
  const vorher = JSON.stringify(s.zeilen.get(`${NUTZER}|wiki|aktuell`));
  const ctx = await s.kontext(browser);
  await angemeldet(ctx);
  const { page } = await s.seite(ctx);
  await expect(page.locator('.wartet')).toHaveText('1 Ergänzung wartet auf den Sonntagslauf');
  await page.goto('/konto?wolke=test#/artikel/rasen-maehen');
  await page.locator('#ergtext').fill('Mulchen statt kompostieren?');
  await page.locator('[data-ergaenzen]').click();
  await expect(page.locator('#ergstand')).toHaveText('Vorgemerkt. Der Sonntagslauf arbeitet es ein.');

  const neu = [...s.zeilen.values()].filter(z => z.sammlung === 'wiki-eingang' && !z.id.startsWith('alt'));
  expect(neu).toHaveLength(1);
  expect(neu[0].user_id).toBe(NUTZER);
  expect(neu[0].daten).toMatchObject({ text: 'Mulchen statt kompostieren?', klasse: 'garten', stand: 'neu' });
  expect(neu[0].daten.am).toMatch(/^\d{4}-\d\d-\d\dT/);
  expect(JSON.stringify(s.zeilen.get(`${NUTZER}|wiki|aktuell`))).toBe(vorher);
  expect([...s.zeilen.values()].every(z => ['wiki', 'wiki-eingang'].includes(z.sammlung))).toBe(true);
  await ctx.close();
});

test('Zwei Tabs: angemeldet in einem heißt angemeldet im anderen, Abmelden in Klar zeigt die Anmeldung', async ({ browser }) => {
  const s = speicher(); s.wikiAnlegen();
  const ctx = await s.kontext(browser);
  const a = await s.seite(ctx);
  await anmelden(a.page);
  await expect(a.page.locator('#inhalt h1')).toHaveText('Deine Abläufe, als Nachschlagewerk');
  const b = await s.seite(ctx, '/konto?wolke=test#/wissen/mhd');
  await expect(b.page.locator('#inhalt h1')).toHaveText('Mindesthaltbarkeit');
  await expect(b.page.locator('#tor')).toHaveCount(0);
  /* Ein Token-Wechsel im anderen Tab meldet nichts ab */
  await a.page.evaluate(() => window.__wikiAuthEreignis('TOKEN_REFRESHED', { user: { id: 'u-lukastestde' } }));
  await expect(a.page.locator('#tor')).toHaveCount(0);
  /* Abmelden kommt von Klar herüber */
  await b.page.evaluate(() => window.__wikiAuthEreignis('SIGNED_OUT', null));
  await expect(b.page.locator('#tor[data-ansicht="anmelden"]')).toBeVisible();
  await anmelden(b.page);
  await expect(b.page.locator('#tor')).toHaveCount(0);
  await expect(b.page.locator('#inhalt h1')).toHaveText('Mindesthaltbarkeit');
  expect([...a.fehler, ...b.fehler]).toEqual([]);
  await ctx.close();
});

test('Ohne Netz startet die App mit dem zuletzt geladenen Stand', async ({ browser }) => {
  const s = speicher(); s.wikiAnlegen();
  const ctx = await s.kontext(browser);
  await angemeldet(ctx);
  const { page, fehler } = await s.seite(ctx, '/konto?wolke=test#/artikel/vorrat-pruefen');
  await expect(page.locator('#inhalt h1')).toHaveText('Vorrat prüfen');
  await page.evaluate(() => localStorage.setItem('test.offline', '1'));
  await page.reload();
  await expect(page.locator('#inhalt h1')).toHaveText('Vorrat prüfen');
  await expect(page.locator('#tor')).toHaveCount(0);
  await expect(page.locator('.ergaenzen')).toHaveCount(0);
  expect(fehler).toEqual([]);
  await ctx.close();
});

test('Ohne Anmeldung wird die Kopie gelöscht', async ({ browser }) => {
  const s = speicher(); s.wikiAnlegen();
  const ctx = await s.kontext(browser);
  await angemeldet(ctx);
  const { page } = await s.seite(ctx);
  await expect(page.locator('#inhalt h1')).toHaveText('Deine Abläufe, als Nachschlagewerk');
  expect(await page.evaluate(() => !!localStorage.getItem('wiki.kopie'))).toBe(true);
  await page.evaluate(() => window.__wikiAuthEreignis('SIGNED_OUT', null));
  await expect(page.locator('#tor[data-ansicht="anmelden"]')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('wiki.kopie'))).toBeNull();
  await ctx.close();
});

test('Neue Fassung vom Sonntagslauf kommt beim Zurückkommen ins Fenster', async ({ browser }) => {
  const s = speicher(); s.wikiAnlegen();
  const ctx = await s.kontext(browser);
  await angemeldet(ctx);
  await ctx.addInitScript(() => { window.__wikiPruefAbstand = 1; });
  const { page } = await s.seite(ctx, '/konto?wolke=test#/artikel/rasen-maehen');
  await expect(page.locator('.zahlen, #inhalt h1').first()).toBeVisible();
  /* Ohne neue Fassung passiert nichts */
  await page.evaluate(() => { window.__nichtNeu = true; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__nichtNeu)).toBe(true);
  /* Der Sonntagslauf schreibt Fassung 14 */
  const neu = { ...BEISPIEL, fassung: 14, aktualisiert: '2026-10-18', artikel: BEISPIEL.artikel.map(a => a.id === 'rasen-maehen' ? { ...a, name: 'Rasen mähen und mulchen' } : a) };
  s.zeilen.set(`${NUTZER}|wiki|aktuell`, { user_id: NUTZER, sammlung: 'wiki', id: 'aktuell', daten: { baum: JSON.stringify(neu), aktualisiert: '2026-10-18T00:30:00.000Z', fassung: 14 } });
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('#inhalt h1')).toHaveText('Rasen mähen und mulchen');
  await ctx.close();
});

test('Kleines App-Fenster: der Inhalt beginnt in der oberen Hälfte', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac', 'eigene Fenstergröße');
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.addInitScript(b => { window.WIKI_DATEN = { baum: b, wartend: 0, ergaenzen: null }; }, BEISPIEL);
  await page.goto('/leer#/artikel/tomaten-pflanzen');
  await expect(page.locator('#inhalt h1')).toHaveText('Tomaten pflanzen');
  await page.waitForTimeout(700);
  const oben = await page.locator('.inhalt').evaluate(e => e.getBoundingClientRect().top);
  expect(oben).toBeLessThan(350);
});
