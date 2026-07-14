import { defineConfig, devices } from "@playwright/test";

const localBaseUrl = "http://127.0.0.1:4173";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? localBaseUrl;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "output/playwright/test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { outputFolder: "output/playwright/report", open: "never" }],
      ]
    : [
        ["list"],
        ["html", { outputFolder: "output/playwright/report", open: "never" }],
      ],
  use: {
    baseURL,
    locale: "zh-CN",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      testMatch: [
        /desktop-main-flow\.spec\.ts/,
        /second-run-and-easter-eggs\.spec\.ts/,
      ],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile-chromium",
      testMatch: /mobile-main-flow\.spec\.ts/,
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --port 4173 --hostname 127.0.0.1",
        url: localBaseUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
