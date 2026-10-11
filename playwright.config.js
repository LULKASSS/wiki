// Browsertests mit erfundenen Daten. Nutzt das installierte Chrome (wie Klar).
// PW_CHROMIUM=<Pfad> nimmt stattdessen ein bestimmtes Chromium.
import { defineConfig, devices } from '@playwright/test';

const start = process.env.PW_CHROMIUM ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } } : { channel: process.env.CI ? undefined : 'chrome' };
export default defineConfig({
  testDir: 'test',
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:5192', locale: 'de-DE', timezoneId: 'Europe/Berlin', ...start },
  projects: [
    { name: 'mac', use: { viewport: { width: 1360, height: 860 } } },
    { name: 'mac-dunkel', use: { viewport: { width: 1360, height: 860 }, colorScheme: 'dark' }, grep: /@dunkel/ },
    { name: 'iphone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' }, grep: /@mobil/ }
  ],
  webServer: { command: 'node scripts/serve.mjs', env: { PORT: '5192' }, url: 'http://localhost:5192', reuseExistingServer: !process.env.CI }
});
