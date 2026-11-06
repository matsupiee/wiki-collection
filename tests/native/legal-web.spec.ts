import { expect, test } from "@playwright/test";
test("Webは未ログインで規約を公開し、ゲーム・ログイン画面は提供しない", async ({
  page,
  request,
}) => {
  await page.goto("http://localhost:3001/");
  const links = page.getByRole("navigation", { name: "規約・法定表記" }).getByRole("link");
  await expect(links).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    const title = await links.nth(i).innerText();
    await links.nth(i).click();
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByText(/最終更新日:/)).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.getByRole("link", { name: "規約・法定表記一覧", exact: true }).click();
  }
  for (const path of [
    "login",
    "packs",
    "packs/basic",
    "collection",
    "cards/test",
    "battle",
    "battle/2026-11-06/test",
    "market",
    "market/new",
    "market/test",
    "me",
    "me/wallet",
    "me/trades",
    "me/openings",
    "point",
    "openings/test",
    "openings/test/result",
  ]) {
    const response = await request.get(`http://localhost:3001/${path}`);
    expect(response.status(), path).toBe(404);
  }
});
