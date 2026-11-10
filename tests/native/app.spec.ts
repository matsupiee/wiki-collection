import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

const prefix = `native-e2e-${Date.now()}-`;
test.beforeAll(() => {
  execFileSync("bun", ["packages/db/src/seed/native-cli.ts"], {
    env: { ...process.env, NATIVE_SEED_PREFIX: prefix },
  });
});

test("ログイン・開封再開・カード・履歴・ログアウト", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "アカウントをお持ちの方はログイン", exact: true }).click();
  await page.getByRole("textbox", { name: "メールアドレス" }).fill(`${prefix}1@example.com`);
  await page.getByRole("textbox", { name: "パスワード" }).fill("password1234");
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await expect(page.getByRole("button", { name: "基本パックを選ぶ", exact: true })).toBeVisible();
  // 指を離す前から袋が移動し、そのまま引き戻しても開封しない。
  const basicPack = page.getByRole("button", { name: "基本パックを選ぶ", exact: true });
  const initial = (await basicPack.boundingBox())!;
  const centerX = initial.x + initial.width / 2;
  const centerY = initial.y + initial.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX - 55, centerY, { steps: 10 });
  await expect.poll(async () => (await basicPack.boundingBox())?.x).toBeLessThan(initial.x - 25);
  await page.mouse.move(centerX, centerY, { steps: 10 });
  await page.mouse.up();
  await expect.poll(async () => (await basicPack.boundingBox())?.x).toBeCloseTo(initial.x, 0);
  await page.getByRole("button", { name: "基本パックを選ぶ", exact: true }).click();
  await expect(page.getByText("0pt", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "無料で開封する", exact: true }).click();
  await expect(page.getByRole("button", { name: "タップで開ける", exact: true })).toBeVisible();
  const opening = page.url();
  // 戻り先がある状態で、途中まで／最後まで切り口をなぞる。
  const tearArea = page.getByTestId("tear-area");
  const swipe = async (fraction: number) => {
    // 登場アニメーションが完了してから座標を取得する。
    await expect(async () => {
      const box = await tearArea.boundingBox();
      expect(box?.width).toBeGreaterThan(140);
    }).toPass();
    const box = (await tearArea.boundingBox())!;
    await page.mouse.move(box.x + 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * fraction, box.y + box.height / 2, { steps: 20 });
    await page.mouse.up();
  };
  // A failed skip must leave the same pack openable, even if the player swipes while it is pending.
  const revealPath = /\/api\/trpc\/opening\.reveal(?:\?|$)/;
  let releaseResponse!: () => void;
  const hold = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route(
    revealPath,
    async (route) => {
      await hold;
      await route.fulfill({ status: 503, contentType: "application/json", body: "[]" });
    },
    { times: 1 },
  );
  const pendingSkip = page.waitForRequest(revealPath);
  await page.getByRole("button", { name: "スキップ", exact: true }).click();
  await pendingSkip;
  try {
    await swipe(0.95);
  } finally {
    releaseResponse();
  }
  await expect(page.getByRole("alert")).toBeVisible();
  await swipe(0.45);
  await expect(page).toHaveURL(opening);
  await expect(page.getByRole("button", { name: "タップで開ける", exact: true })).toBeVisible();
  await swipe(0.95);
  await expect(page.getByRole("button", { name: /、めくる$/ })).toBeVisible();
  await expect(page).toHaveURL(opening);
  await page.reload();
  await expect(page.getByRole("button", { name: "タップで開ける", exact: true })).toBeVisible();
  expect(page.url()).toBe(opening);
  await page.getByRole("button", { name: "タップで開ける", exact: true }).click();
  const front = page.getByRole("button", { name: /、めくる$/ });
  for (let i = 1; i < 5; i++) {
    await expect(page.getByText(new RegExp(`^${i} / 5`))).toBeVisible();
    await expect(front).toHaveCount(1);
    await front.click();
  }
  await page.getByRole("button", { name: /、開封結果を見る$/ }).click();
  await expect(page.getByText("開封結果", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "コレクションへ", exact: true }).click();
  await page.getByRole("button", { name: "並び順", exact: true }).click();
  await page.getByRole("button", { name: "閲覧数順", exact: true }).click();
  await page.getByRole("button", { name: "並び順", exact: true }).click();
  await page.getByRole("button", { name: "記事サイズ順", exact: true }).click();
  await expect(page.getByRole("tab")).toHaveCount(4);
  await page.getByRole("tab", { name: /マイページ/ }).click();
  await page.getByRole("button", { name: "開封履歴", exact: true }).click();
  await expect(page.getByRole("button", { name: /結果を見る/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "もどる", exact: true }).click();
  await page.getByRole("button", { name: "pt の履歴", exact: true }).click();
  await expect(page.getByText("pt の履歴", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "もどる", exact: true }).click();
  for (const [slug, label] of Object.entries({
    terms: "利用規約",
    privacy: "プライバシーポリシー",
    tokushoho: "特定商取引法に基づく表記",
    "payment-services": "資金決済法に基づく表示",
  })) {
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: label, exact: true }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(`http://localhost:3001/legal/${slug}`);
    await expect(popup.getByRole("heading", { name: label, exact: true })).toBeVisible();
    await expect(popup.getByText(/最終更新日:/)).toBeVisible();
    await popup.close();
    await expect(page).toHaveURL(/\/me$/);
  }
  await page.getByRole("button", { name: "ログアウト", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "メールアドレス" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("2人でオークション出品・入札・ポイント購入", async ({ browser }) => {
  const sellerContext = await browser.newContext();
  const buyerContext = await browser.newContext();
  const seller = await sellerContext.newPage();
  const buyer = await buyerContext.newPage();
  const login = async (p: typeof seller, email: string) => {
    await p.goto("http://localhost:8082/login");
    await p.getByRole("button", { name: "アカウントをお持ちの方はログイン", exact: true }).click();
    await p.getByRole("textbox", { name: "メールアドレス" }).fill(email);
    await p.getByRole("textbox", { name: "パスワード" }).fill("password1234");
    await p.getByRole("button", { name: "ログイン", exact: true }).click();
    await expect(p.getByRole("tab", { name: /マーケット/ })).toBeVisible();
  };
  await login(seller, `${prefix}2@example.com`);
  await login(buyer, `${prefix}1@example.com`);
  await seller.goto("http://localhost:8082/collection");
  await seller
    .getByRole("button", { name: /の詳細を見る/ })
    .first()
    .click();
  await seller.getByRole("button", { name: "出品する", exact: true }).click();
  await seller.getByRole("button", { name: "1時間", exact: true }).click();
  await seller.getByRole("button", { name: "12時間", exact: true }).click();
  await seller.getByRole("textbox", { name: "開始価格（pt）", exact: true }).fill("100");
  await seller.getByRole("button", { name: "出品する", exact: true }).click();
  await expect(seller).toHaveURL(/\/market\/(?!new)[^/]+$/);
  await expect(seller.getByText(/残り (11時間59分|12時間0分)/)).toBeVisible();
  await buyer.goto(seller.url());
  await buyer.getByRole("textbox", { name: /入札額/ }).fill("100");
  await buyer.getByRole("button", { name: "入札", exact: true }).click();
  await buyer.getByRole("button", { name: "入札する", exact: true }).click();
  await expect(buyer.getByText("あなたが最高額です", { exact: true })).toBeVisible();
  await seller.reload();
  await expect(
    seller.getByRole("button", { name: "入札があるため取り下げられません", exact: true }),
  ).toBeDisabled();
  await buyer.goto("http://localhost:8082/point");
  for (const label of ["特定商取引法に基づく表記", "資金決済法に基づく表示"]) {
    const popupPromise = buyer.waitForEvent("popup");
    await buyer.getByRole("button", { name: label, exact: true }).click();
    const popup = await popupPromise;
    await expect(popup.getByRole("heading", { name: label, exact: true })).toBeVisible();
    await popup.close();
    await expect(buyer).toHaveURL(/\/point$/);
  }
  const product = buyer.getByRole("button", { name: /500pt/ }).first();
  await expect(product).toBeEnabled();
  {
    await product.click();
    await buyer.getByRole("button", { name: "購入する", exact: true }).click();
    await expect(buyer.getByText("pt を購入します", { exact: true })).not.toBeVisible();
  }
  await sellerContext.close();
  await buyerContext.close();
});

test("新規登録と未ログイン時の保護、Webとアプリの規約", async ({ page }) => {
  await page.goto("/collection");
  await expect(page.getByRole("textbox", { name: "メールアドレス" })).toBeVisible();
  for (const slug of ["terms", "privacy", "tokushoho", "payment-services"]) {
    await page.goto(`http://localhost:3001/legal/${slug}`);
    await expect(page.getByText(/最終更新日:/)).toBeVisible();
  }
  await page.goto("http://localhost:8082/login");
  await page.getByRole("textbox", { name: "ニックネーム" }).fill("新規登録テスト");
  await page.getByRole("textbox", { name: "メールアドレス" }).fill(`${prefix}new@example.com`);
  await page.getByRole("textbox", { name: "パスワード" }).fill("password1234");
  await page.getByRole("button", { name: "登録する", exact: true }).click();
  await expect(page.getByRole("button", { name: "基本パックを選ぶ", exact: true })).toBeVisible();
  const freePacks = page.getByRole("button", { name: "無料パック 残り10個", exact: true });
  await expect(freePacks).toHaveText("10");
  await freePacks.click();
  await expect(page.getByText("10分ごとに無料パックが1つ引けるようになる")).toBeVisible();
  await page
    .getByRole("button", { name: "無料パックの説明を閉じる" })
    .click({ position: { x: 8, y: 200 } });
  await expect(page.getByText("10分ごとに無料パックが1つ引けるようになる")).toHaveCount(0);
  await expect(freePacks).toBeVisible();
  await page.getByRole("button", { name: "ダブルレア確定ガチャへ", exact: true }).click();
  await expect(page.getByText("100pt", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "100pt で開封する", exact: true }).click();
  await expect(page.getByText("ポイントが不足しています", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "ポイント購入へ", exact: true }).click();
  await expect(page).toHaveURL(/\/point$/);
});
