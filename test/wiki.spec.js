// Die Oberfläche mit dem erfundenen Beispiel-Wiki, ohne Konto.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const BEISPIEL = JSON.parse(readFileSync(new URL('./beispiel.json', import.meta.url), 'utf8'));

/** Startet die Seite mit dem Beispiel-Wiki und sammelt Konsolenfehler. */
async function oeffnen(page, adresse = '', wahl = {}) {
  const fehler = [];
  page.on('pageerror', e => fehler.push(e.message));
  page.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
  await page.addInitScript(([baum, wahl]) => {
    const eingang = [];
    window.__eingang = eingang;
    window.WIKI_DATEN = {
      baum: wahl.baum || baum, wartend: wahl.wartend || 0, vorher: wahl.vorher || null,
      ergaenzen: wahl.ohneErgaenzen ? null : (text, klasse) => { eingang.push({ text, klasse }); return Promise.resolve(); }
    };
  }, [BEISPIEL, wahl]);
  await page.goto('/leer' + adresse);
  return fehler;
}
/** Klick über das Element selbst: die feste Leiste unten am Handy liegt sonst manchmal darüber. */
const tippen = (page, sel) => page.locator(sel).first().evaluate(b => b.click());

/* Fassung 12: ein neuer Abschnitt in „Rasen mähen“, ein ergänzter Schritt in „Tomaten pflanzen“ */
const NEUER = {
  ...BEISPIEL, fassung: 12, aktualisiert: '2026-10-08',
  artikel: BEISPIEL.artikel.map(a => a.id === 'rasen-maehen' ? { ...a, abschnitte: [...a.abschnitte, { titel: 'Im Herbst', intro: null, schritte: ['Laub vorher abrechen'], hinweise: [] }] }
    : a.id === 'tomaten-pflanzen' ? { ...a, abschnitte: [{ ...a.abschnitte[0], schritte: [...a.abschnitte[0].schritte, 'Mulch auflegen'] }, a.abschnitte[1]] } : a)
};

test('Startseite: Frage mit Suche, Anlässe als Linienplan, Bereiche @mobil @dunkel', async ({ page }) => {
  const fehler = await oeffnen(page);
  await expect(page.locator('#inhalt h1')).toHaveText('Wie machst du das nochmal?');
  await expect(page.locator('.suchfeld')).toBeVisible();
  await expect(page.locator('.linie')).toHaveCount(1);
  await expect(page.locator('.linie .station')).toHaveText(['Tomaten pflanzen', 'Rasen mähen']);
  await expect(page.locator('.linie svg.spur line')).toHaveCount(1);
  await expect(page.locator('.chip')).toHaveCount(2);
  await expect(page.locator('.neukarte')).toHaveCount(0);
  expect(fehler).toEqual([]);
});

test('Leere Gruppen werden aus den Daten benannt', async ({ page }) => {
  await oeffnen(page, '#/ablaeufe');
  await expect(page.locator('.leiste .leise')).toHaveText('Freizeit erscheint, sobald dort Abläufe beschrieben sind.');
  await expect(page.locator('.leer-hinweis')).toHaveText('Freizeit erscheint, sobald dort Abläufe beschrieben sind.');
});

test('Kein Titel oben links, kein Entwurf-Etikett, keine Klar-Einbettung', async ({ page }) => {
  await oeffnen(page);
  await expect(page.locator('#marke')).toHaveCount(0);
  await expect(page.locator('.entwurf')).toHaveCount(0);
  await expect(page.locator('#app')).not.toHaveAttribute('data-klar', /.*/);
});

for (const [adresse, titel] of [
  ['#/artikel/tomaten-pflanzen', 'Tomaten pflanzen'],
  ['#/wissen/mhd', 'Mindesthaltbarkeit'],
  ['#/anlass/fruehling', 'Frühling im Garten'],
  ['#/werkzeug/maeher', 'Rasenmäher'],
  ['#/ablaeufe/kueche', 'Abläufe'],
  ['#/werkzeuge', 'Nachschlagen'],
  ['#a.rasen-maehen', 'Rasen mähen'],
  ['#w.frostgrenze', 'Frost und Eisheilige']
]) {
  test(`Direktlink ${adresse} öffnet genau das @mobil`, async ({ page }) => {
    const fehler = await oeffnen(page, adresse);
    await expect(page.locator('#inhalt h1')).toHaveText(titel);
    expect(fehler).toEqual([]);
  });
}

test('Bereich öffnen, Ablauf öffnen, Zurück geht zurück @mobil', async ({ page }) => {
  await oeffnen(page);
  await tippen(page, '.chip[data-kategorie="kueche"]');
  await expect(page.locator('#inhalt h1')).toHaveText('Abläufe');
  await expect(page).toHaveURL(/#\/ablaeufe\/kueche$/);
  await tippen(page, '.zeile[data-artikel="vorrat-pruefen"]');
  await expect(page.locator('#inhalt h1')).toHaveText('Vorrat prüfen');
  await expect(page.locator('[data-ziel="ablaeufe"]:visible')).toHaveAttribute('aria-current', 'page');
  await tippen(page, '[data-aktion="zurueck"]');
  await expect(page.locator('#inhalt h1')).toHaveText('Abläufe');
  await page.goBack();
  await expect(page.locator('#inhalt h1')).toHaveText('Wie machst du das nochmal?');
});

test('Anlass: Weg ansehen und Schritt für Schritt durchgehen @mobil', async ({ page }) => {
  await oeffnen(page);
  await tippen(page, '.linie [data-an="fruehling"]');
  await expect(page.locator('#inhalt h1')).toHaveText('Frühling im Garten');
  await expect(page.locator('.anlass .station')).toHaveCount(2);
  await tippen(page, '.los');
  await expect(page.locator('#inhalt h1')).toHaveText('Tomaten pflanzen');
  await expect(page.locator('.weiter-kopf')).toHaveText('Frühling im Garten · Schritt 1 von 2');
  await tippen(page, '.weiter .nach');
  await expect(page.locator('#inhalt h1')).toHaveText('Rasen mähen');
  await expect(page.locator('.weiter .nach')).toBeDisabled();
  /* Zurück und wieder vor: der Anlass bleibt dabei */
  await page.goBack();
  await expect(page.locator('#inhalt h1')).toHaveText('Tomaten pflanzen');
  await page.goForward();
  await expect(page.locator('.weiter-kopf')).toHaveText('Frühling im Garten · Schritt 2 von 2');
});

test('Ablauf ohne Anlass hat keine Weiter-Leiste, Station im Linienplan öffnet den Ablauf im Anlass', async ({ page }) => {
  await oeffnen(page, '#/artikel/rasen-maehen');
  await expect(page.locator('#inhalt h1')).toHaveText('Rasen mähen');
  await expect(page.locator('.weiter')).toHaveCount(0);
  await tippen(page, '[data-ziel="start"]');
  await tippen(page, '.linie .station button[data-artikel="rasen-maehen"]');
  await expect(page.locator('.weiter-kopf')).toHaveText('Frühling im Garten · Schritt 2 von 2');
});

test('Hinweise stehen am Mac als Randnotiz neben den Schritten, am Handy darunter @mobil', async ({ page, isMobile }) => {
  await oeffnen(page, '#/artikel/rasen-maehen');
  await expect(page.locator('.notiz li')).toHaveText(['Nicht bei Nässe mähen.']);
  const [weg, notiz] = await Promise.all([page.locator('ol.weg').boundingBox(), page.locator('.notiz:not(.leer)').boundingBox()]);
  if (isMobile) expect(notiz.y).toBeGreaterThan(weg.y + weg.height - 1);
  else expect(notiz.x).toBeGreaterThan(weg.x + weg.width - 1);
});

test('Schritte füllen sich beim Lesen, Abschnitte als Leiste', async ({ page }) => {
  await oeffnen(page, '#/artikel/tomaten-pflanzen');
  await expect(page.locator('.inhaltsleiste button')).toHaveText(['Vorbereiten', 'Pflanzen']);
  await expect(page.locator('.weg li.da').first()).toBeVisible();
  await page.locator('.inhaltsleiste [data-sprung="1"]').click();
  await expect(page.locator('#teil-1')).toBeInViewport();
});

test('Zuletzt angesehen auf der Startseite', async ({ page }) => {
  await oeffnen(page, '#/artikel/vorrat-pruefen');
  await expect(page.locator('#inhalt h1')).toHaveText('Vorrat prüfen');
  await tippen(page, '[data-ziel="start"]');
  await expect(page.locator('.zuletzt .eintrag').first()).toHaveText('Vorrat prüfen');
});

test('Handy: Leiste unten, Nachschlagen mit Umschalter @mobil', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'nur Handy');
  await oeffnen(page);
  await expect(page.locator('.leiste')).toBeHidden();
  await expect(page.locator('.unten')).toBeVisible();
  await tippen(page, '.unten [data-ziel="nachschlagen"]');
  await expect(page.locator('#inhalt h1')).toHaveText('Nachschlagen');
  await expect(page.locator('.zeile b')).toHaveText(['Frost und Eisheilige', 'Mindesthaltbarkeit']);
  await tippen(page, '[data-reiter="werkzeuge"]');
  await expect(page.locator('.zeile b')).toHaveText(['Gießkanne', 'Rasenmäher']);
  await expect(page).toHaveURL(/#\/werkzeuge$/);
});

test('Suche mit / findet Text in Schritten und springt in den Abschnitt @mobil', async ({ page }) => {
  await oeffnen(page);
  await expect(page.locator('#inhalt h1')).toHaveText('Wie machst du das nochmal?');
  await page.keyboard.press('/');
  await expect(page.locator('#suchfeld')).toBeFocused();
  await page.keyboard.type('kompost');
  await expect(page.locator('#treffer button').first()).toContainText('Tomaten pflanzen · Vorbereiten');
  await expect(page.locator('#treffer mark').first()).toHaveText(/kompost/i);
  await page.keyboard.press('Enter');
  await expect(page.locator('#inhalt h1')).toHaveText('Tomaten pflanzen');
  await expect(page.locator('#suche')).toHaveCount(0);
});

test('Suche: Esc schließt, ohne Treffer ein Satz', async ({ page }) => {
  await oeffnen(page);
  await tippen(page, '[data-aktion="suchen"]');
  await page.locator('#suchfeld').fill('xyzabc');
  await expect(page.locator('#treffer .nix')).toHaveText('Dazu steht noch nichts im Wiki.');
  await page.keyboard.press('Escape');
  await expect(page.locator('#suche')).toHaveCount(0);
});

test('Unbestätigtes ist markiert', async ({ page }) => {
  await oeffnen(page, '#/artikel/tomaten-pflanzen');
  await expect(page.locator('.unbest').first()).toHaveText('unbestätigt');
});

test('Neu seit dem letzten Besuch: Karte, Sprung in den Abschnitt, Gesehen @mobil', async ({ page }) => {
  const fehler = await oeffnen(page, '', { baum: NEUER, vorher: BEISPIEL });
  await expect(page.locator('.neukarte .gross')).toHaveText('2');
  await expect(page.locator('.neukarte')).toContainText('seit Fassung 11 · jetzt Fassung 12');
  await expect(page.locator('.neuliste li')).toHaveText([/Tomaten pflanzen.*Ergänzt: Vorbereiten/, /Rasen mähen.*Neuer Abschnitt: Im Herbst/]);
  await expect(page.locator('.linie .neupunkt')).toHaveCount(2);
  await tippen(page, '.neuliste [data-artikel="rasen-maehen"]');
  await expect(page.locator('#inhalt h1')).toHaveText('Rasen mähen');
  await expect(page.locator('#teil-1.istneu')).toBeInViewport();
  await expect(page.locator('#teil-1 .marke')).toHaveText('neu');
  await tippen(page, '[data-ziel="start"]');
  await tippen(page, '[data-aktion="gesehen"]');
  await expect(page.locator('.neukarte')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#inhalt h1')).toHaveText('Wie machst du das nochmal?');
  await expect(page.locator('.neukarte')).toHaveCount(0);
  expect(fehler).toEqual([]);
});

test('Ohne älteren Stand ist nichts neu', async ({ page }) => {
  await oeffnen(page, '', { baum: NEUER });
  await expect(page.locator('#inhalt h1')).toHaveText('Wie machst du das nochmal?');
  await expect(page.locator('.neukarte')).toHaveCount(0);
});

test('Etwas ergänzen geht an den Eingang @mobil', async ({ page }) => {
  await oeffnen(page, '#/artikel/rasen-maehen');
  await tippen(page, '[data-ergauf]');
  await page.locator('#ergtext').fill('Mulchen statt kompostieren?');
  await tippen(page, '[data-ergaenzen]');
  await expect(page.locator('#ergstand')).toHaveText('Vorgemerkt. Der Sonntagslauf arbeitet es ein.');
  expect(await page.evaluate(() => window.__eingang)).toEqual([{ text: 'Mulchen statt kompostieren?', klasse: 'garten' }]);
  await expect(page.locator('#seitenfuss .wartet')).toHaveText('1 Ergänzung wartet auf den Sonntagslauf');
});

test('Ohne Speicher kein Ergänzen-Feld', async ({ page }) => {
  await oeffnen(page, '#/artikel/rasen-maehen', { ohneErgaenzen: true });
  await expect(page.locator('#inhalt h1')).toHaveText('Rasen mähen');
  await expect(page.locator('.ergaenzen')).toHaveCount(0);
});

test('Ohne Daten und ohne Konto ein Hinweis statt Fehler', async ({ page }) => {
  const fehler = [];
  page.on('pageerror', e => fehler.push(e.message));
  await page.goto('/leer');
  await expect(page.locator('#inhalt h1')).toHaveText('Noch keine Daten');
  expect(fehler).toEqual([]);
});

for (const adresse of ['', '#/artikel/tomaten-pflanzen', '#/ablaeufe', '#/fachwissen']) {
  test(`Kein Querscrollen, bis ans Ende scrollbar: ${adresse || 'Start'} @mobil @dunkel`, async ({ page, isMobile }) => {
    const fehler = await oeffnen(page, adresse);
    await expect(page.locator('#inhalt h1')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const [breit, sicht] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(breit).toBeLessThanOrEqual(sicht);
    await expect(page.locator(isMobile ? '#seitenfuss' : '#leistefuss')).toBeInViewport();
    expect(fehler).toEqual([]);
  });
}

test('Web-App: Manifest und Icons', async ({ page, request }) => {
  await oeffnen(page);
  const manifest = await (await request.get('/' + await page.locator('link[rel="manifest"]').getAttribute('href'))).json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.some(i => i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) expect((await request.get('/' + icon.src)).ok()).toBe(true);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', /^data:image\/png;base64,.{200}/);
});
