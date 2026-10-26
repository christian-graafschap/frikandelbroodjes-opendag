import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  // Alle tests tegelijk draaien; anders lopen de tests uit één bestand na elkaar in één worker.
  fullyParallel: true,
  // De pagina draait lokaal: 2 s is ruim genoeg. Met de standaard van 5 s wacht elke falende test onnodig lang.
  expect: { timeout: 2_000 },
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/resultaat.json" }],
    ["list"]
  ],
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "off"
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } }
  ],
  webServer: {
    command: "node server.js",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: { LOCAL_ONLY: "true", PORT: "3000" },
    timeout: 30_000
  }
});
