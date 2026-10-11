// @ts-check
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "test",
  timeout: 30000,
  use: { baseURL: "http://localhost:4174" },
  webServer: { command: "node scripts/server.js", url: "http://localhost:4174", reuseExistingServer: !process.env.CI },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "handy", use: { ...devices["Pixel 7"] } }
  ]
});
