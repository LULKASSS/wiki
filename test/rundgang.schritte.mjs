// Rundgang für ui-pruefung: wie Lukas das Wiki benutzt. Klicks über das Element selbst,
// weil die feste Leiste unten am Handy sonst manchmal darüber liegt.
const tippen = (page, sel) => page.locator(sel).first().evaluate(b => b.click());
const warte = page => page.waitForTimeout(700);

export default async (page, foto) => {
  await page.waitForSelector('#inhalt h1');
  await foto('start');
  if (await page.locator('.neuliste [data-teil]').count()) {
    await tippen(page, '.neuliste [data-teil]'); await warte(page);
    await foto('neu-abschnitt');
    await tippen(page, '[data-ziel="start"]'); await warte(page);
  }
  await tippen(page, '.linie [data-an]'); await warte(page);
  await foto('anlass');
  await tippen(page, '.los'); await warte(page);
  await foto('ablauf');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await warte(page);
  await foto('ablauf-ende');
  await tippen(page, '[data-ziel="ablaeufe"]'); await warte(page);
  await foto('ablaeufe');
  await tippen(page, '[data-ziel="nachschlagen"]'); await warte(page);
  await foto('nachschlagen');
  await tippen(page, '.zeile[data-fach]'); await warte(page);
  await foto('fachwissen');
  await tippen(page, '[data-aktion="suchen"]'); await warte(page);
  await page.locator('#suchfeld').fill('kfz'); await warte(page);
  await foto('suche');
  await page.locator('#suchfeld').fill('%%%'); await warte(page);
  await foto('suche-leer');
  await page.keyboard.press('Escape');
};
