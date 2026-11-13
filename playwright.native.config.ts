import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/native",
  timeout: 60000,
  workers: 1,
  use: { locale: "ja-JP", baseURL: "http://localhost:8082", viewport: { width: 390, height: 844 }, headless: true },
  reporter: "list",
  outputDir: "test-results/native",
});
