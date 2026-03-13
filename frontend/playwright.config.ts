import { defineConfig, devices } from "@playwright/test";

// Default to the Docker container. Override with BASE_URL env var to point
// at a local dev server (e.g. BASE_URL=http://127.0.0.1:3000).
const baseURL = process.env.BASE_URL ?? "http://localhost:8000";
const useDevServer = baseURL === "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  ...(useDevServer && {
    webServer: {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  }),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
