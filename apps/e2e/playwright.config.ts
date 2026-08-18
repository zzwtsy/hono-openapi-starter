import process from "node:process";

import { defineConfig, devices } from "@playwright/test";
import { e2eClientHeaders } from "./src/constants.js";

const isCI = process.env.CI === "true";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  workers: isCI ? 1 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: isCI
    ? [["line"], ["html", { outputFolder: "./playwright-report", open: "never" }]]
    : [["list"], ["html", { outputFolder: "./playwright-report", open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        extraHTTPHeaders: e2eClientHeaders("setup"),
      },
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        extraHTTPHeaders: e2eClientHeaders("chromium"),
      },
      dependencies: ["setup"],
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        extraHTTPHeaders: e2eClientHeaders("firefox"),
      },
      dependencies: ["setup"],
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        extraHTTPHeaders: e2eClientHeaders("webkit"),
      },
      dependencies: ["setup"],
    },
  ],
});
