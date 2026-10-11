// Rendert die PNG-Icons aus src/icon.svg (einmal laufen lassen, wenn sich das Icon ändert).
const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

(async () => {
  const svg = fs.readFileSync(path.join(__dirname, "..", "src", "icon.svg"), "utf8");
  const browser = await chromium.launch();
  for (const groesse of [180, 192, 512]) {
    const page = await browser.newPage({ viewport: { width: groesse, height: groesse } });
    // Für iOS ohne runde Ecken: iOS rundet selbst ab.
    const inhalt = groesse === 180 ? svg.replace('rx="112"', 'rx="0"') : svg;
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${inhalt}`);
    await page.screenshot({ path: path.join(__dirname, "..", "src", `icon-${groesse}.png`), omitBackground: true });
    await page.close();
  }
  await browser.close();
})();
