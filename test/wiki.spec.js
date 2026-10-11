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
      baum, wartend: wahl.wartend || 0,
      ergaenzen: wahl.ohneErgaenzen ? null : (text, klasse) => { eingang.push({ text, klasse }); return Promise.resolve(); }
    };
  }, [BEISPIEL, wahl]);
  await page.goto('/leer' + adresse);
  return fehler;
}

test('Startseite zeigt Zahlen, Anlässe und Kategorien @mobil @dunkel', async ({ page }) => {
  const fehler = await oeffnen(page);
  await expect(page.locator('#inhalt h1')).toHaveText('Deine Abläufe, als Nachschlagewerk');
  await expect(page.locator('.zahlen')).toContainText('3 Abläufe');
  await expect(page.locator('.anlass')).toHaveCount(1);
  expect(fehler).toEqual([]);
});

test('Leere Gruppen werden aus den Daten benannt', async ({ page }) => {
  await oeffnen(page);
  await expect(page.locator('.kats .leise')).toHaveText('Freizeit erscheint, sobald dort echte Abläufe beschrieben sind.');
});

test('Kein Entwurf-Etikett und keine Klar-Einbettung', async ({ page }) => {
  await oeffnen(page);
  await expect(page.locator('.entwurf')).toHaveCount(0);
  await expect(page.locator('#app')).not.toHaveAttribute('data-klar', /.*/);
  await expect(page.locator('.marke')).toBeVisible();
});

for (const [adresse, titel] of [
  ['#/artikel/tomaten-pflanzen', 'Tomaten pflanzen'],
  ['#/wissen/mhd', 'Mindesthaltbarkeit'],
  ['#/anlass/fruehling', 'Frühling im Garten'],
  ['#/werkzeug/maeher', 'Rasenmäher'],
  ['#a.rasen-maehen', 'Rasen mähen']
]) {
  test(`Direktlink ${adresse} öffnet genau das @mobil`, async ({ page }) => {
    const fehler = await oeffnen(page, adresse);
    await expect(page.locator('#inhalt h1')).toHaveText(titel);
    expect(fehler).toEqual([]);
  });
}

test('Klick schreibt die Adresse, Zurück geht zurück', async ({ page }) => {
  await oeffnen(page);
  await page.locator('.reiter [data-tab="ablaeufe"]').click();
  await expect(page).toHaveURL(/#\/ablaeufe$/);
  await page.locator('.eintrag[data-art="vorrat-pruefen"]').click();
  await expect(page).toHaveURL(/#\/artikel\/vorrat-pruefen$/);
  await expect(page.locator('#inhalt h1')).toHaveText('Vorrat prüfen');
  await page.goBack();
  await expect(page.locator('#inhalt h1')).toHaveText('Abläufe');
});

test('Suche mit / findet Text in Schritten', async ({ page }) => {
  await oeffnen(page);
  await page.keyboard.press('/');
  await page.keyboard.type('kompost');
  await expect(page.locator('#treffer button').first()).toContainText('Tomaten pflanzen');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/artikel\/tomaten-pflanzen$/);
});

test('Unbestätigtes ist markiert', async ({ page }) => {
  await oeffnen(page, '#/artikel/tomaten-pflanzen');
  await expect(page.locator('.unbest').first()).toHaveText('unbestätigt');
});

test('Etwas ergänzen geht an den Eingang @mobil', async ({ page }) => {
  await oeffnen(page, '#/artikel/rasen-maehen');
  await page.locator('#ergtext').fill('Mulchen statt kompostieren?');
  await page.locator('[data-ergaenzen]').click();
  await expect(page.locator('#ergstand')).toHaveText('Vorgemerkt. Der Sonntagslauf arbeitet es ein.');
  expect(await page.evaluate(() => window.__eingang)).toEqual([{ text: 'Mulchen statt kompostieren?', klasse: 'garten' }]);
});

test('Ohne Speicher kein Ergänzen-Feld', async ({ page }) => {
  await oeffnen(page, '#/artikel/rasen-maehen', { ohneErgaenzen: true });
  await expect(page.locator('.ergaenzen')).toHaveCount(0);
});

test('Ohne Daten und ohne Konto ein Hinweis statt Fehler', async ({ page }) => {
  const fehler = [];
  page.on('pageerror', e => fehler.push(e.message));
  await page.goto('/leer');
  await expect(page.locator('#inhalt h1')).toHaveText('Noch keine Daten');
  expect(fehler).toEqual([]);
});

test('Kein Querscrollen, bis ans Ende scrollbar @mobil @dunkel', async ({ page }) => {
  const fehler = await oeffnen(page, '#/artikel/tomaten-pflanzen');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const [breit, sicht] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(breit).toBeLessThanOrEqual(sicht);
  await expect(page.locator('.fuss')).toBeInViewport();
  expect(fehler).toEqual([]);
});

test('Web-App: Manifest und Icons', async ({ page, request }) => {
  await oeffnen(page);
  const manifest = await (await request.get('/' + await page.locator('link[rel="manifest"]').getAttribute('href'))).json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.some(i => i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) expect((await request.get('/' + icon.src)).ok()).toBe(true);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', /^data:image\/png;base64,.{200}/);
});
