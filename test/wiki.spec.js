// @ts-check
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const BEISPIEL = JSON.parse(fs.readFileSync(path.join(__dirname, "beispiel.json"), "utf8"));

/** Startet die Seite mit dem erfundenen Beispiel-Wiki und sammelt Konsolenfehler. */
async function oeffnen(page, adresse = "/", wahl = {}) {
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  await page.addInitScript(([baum, wahl]) => {
    const eingang = [];
    window.__eingang = eingang;
    window.WIKI_DATEN = {
      baum,
      wartend: wahl.wartend || 0,
      ergaenzen: wahl.ohneErgaenzen ? null : (text, klasse) => { eingang.push({ text, klasse }); return Promise.resolve(); }
    };
  }, [BEISPIEL, wahl]);
  await page.goto(adresse);
  return fehler;
}

test("Startseite zeigt Zahlen, Anlässe und Kategorien", async ({ page }) => {
  const fehler = await oeffnen(page);
  await expect(page.locator("h1")).toHaveText("Deine Abläufe, als Nachschlagewerk");
  await expect(page.locator(".zahlen")).toContainText("3 Abläufe");
  await expect(page.locator(".anlass")).toHaveCount(1);
  await expect(page.locator(".kats .leise")).toHaveText("Freizeit erscheint, sobald dort echte Abläufe beschrieben sind.");
  expect(fehler).toEqual([]);
});

test("Kein Entwurf-Etikett und keine Klar-Einbettung", async ({ page }) => {
  await oeffnen(page);
  await expect(page.locator(".entwurf")).toHaveCount(0);
  await expect(page.locator("#app")).not.toHaveAttribute("data-klar", /.*/);
  await expect(page.locator(".marke")).toBeVisible();
});

for (const [adresse, titel] of [
  ["/#/artikel/tomaten-pflanzen", "Tomaten pflanzen"],
  ["/#/wissen/mhd", "Mindesthaltbarkeit"],
  ["/#/anlass/fruehling", "Frühling im Garten"],
  ["/#/werkzeug/maeher", "Rasenmäher"],
  ["/#a.rasen-maehen", "Rasen mähen"]
]) {
  test(`Direktlink ${adresse} öffnet genau das`, async ({ page }) => {
    const fehler = await oeffnen(page, adresse);
    await expect(page.locator("#inhalt h1")).toHaveText(titel);
    expect(fehler).toEqual([]);
  });
}

test("Klick schreibt die Adresse, Zurück geht zurück", async ({ page }) => {
  await oeffnen(page);
  await page.locator('.reiter [data-tab="ablaeufe"]').click();
  await expect(page).toHaveURL(/#\/ablaeufe$/);
  await page.locator('.eintrag[data-art="vorrat-pruefen"]').click();
  await expect(page).toHaveURL(/#\/artikel\/vorrat-pruefen$/);
  await expect(page.locator("#inhalt h1")).toHaveText("Vorrat prüfen");
  await page.goBack();
  await expect(page.locator("#inhalt h1")).toHaveText("Abläufe");
});

test("Suche mit / findet Text in Schritten", async ({ page, isMobile }) => {
  test.skip(isMobile, "Tastenkürzel nur am Rechner");
  await oeffnen(page);
  await page.keyboard.press("/");
  await page.keyboard.type("kompost");
  await expect(page.locator("#treffer button").first()).toContainText("Tomaten pflanzen");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/artikel\/tomaten-pflanzen$/);
});

test("Unbestätigtes ist markiert", async ({ page }) => {
  await oeffnen(page, "/#/artikel/tomaten-pflanzen");
  await expect(page.locator(".unbest").first()).toHaveText("unbestätigt");
});

test("Etwas ergänzen geht an den Eingang", async ({ page }) => {
  await oeffnen(page, "/#/artikel/rasen-maehen");
  await page.locator("#ergtext").fill("Mulchen statt kompostieren?");
  await page.locator("[data-ergaenzen]").click();
  await expect(page.locator("#ergstand")).toHaveText("Vorgemerkt. Der Sonntagslauf arbeitet es ein.");
  expect(await page.evaluate(() => window.__eingang)).toEqual([{ text: "Mulchen statt kompostieren?", klasse: "garten" }]);
});

test("Ohne Speicher kein Ergänzen-Feld", async ({ page }) => {
  await oeffnen(page, "/#/artikel/rasen-maehen", { ohneErgaenzen: true });
  await expect(page.locator(".ergaenzen")).toHaveCount(0);
});

test("Ohne Daten ein Hinweis statt Fehler", async ({ page }) => {
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  await page.goto("/");
  await expect(page.locator("#inhalt h1")).toHaveText("Noch keine Daten");
  expect(fehler).toEqual([]);
});

for (const schema of ["light", "dark"]) {
  test(`Kein Querscrollen, bis ans Ende scrollbar (${schema})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: schema });
    const fehler = await oeffnen(page, "/#/artikel/tomaten-pflanzen");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const breite = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(breite[0]).toBeLessThanOrEqual(breite[1]);
    await expect(page.locator(".fuss")).toBeInViewport();
    expect(fehler).toEqual([]);
  });
}

test("Web-App: Manifest und Icons erreichbar", async ({ page, request }) => {
  await oeffnen(page);
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await request.get("/" + href)).json();
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) {
    expect((await request.get("/" + icon.src)).ok()).toBeTruthy();
  }
  expect((await request.get("/icon-180.png")).ok()).toBeTruthy();
});
