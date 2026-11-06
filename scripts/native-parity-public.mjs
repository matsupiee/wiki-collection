import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const round = process.argv[2] ?? "13";
const dir = `output/native-parity/round-${round}`;
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch();
for (const [platform, port] of [
  ["web", 3001],
  ["native", 8082],
]) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`http://localhost:${port}/login`);
  await page.waitForTimeout(1800);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${dir}/login-${platform}.png` });
  await page
    .getByRole("button", { name: "アカウントをお持ちの方はログイン" })
    .click();
  await page.getByText("Welcome Back", { exact: true }).waitFor();
  await page.screenshot({ path: `${dir}/signin-${platform}.png` });
  for (const document of [
    "terms",
    "privacy",
    "tokushoho",
    "payment-services",
  ]) {
    await page.goto(`http://localhost:${port}/legal/${document}`);
    await page.waitForTimeout(600);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${dir}/legal-${document}-${platform}.png` });
  }
  await context.close();
}
await browser.close();
