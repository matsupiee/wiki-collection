import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

const prefix = `native-e2e-${Date.now()}-`;
test.beforeAll(() => {
  execFileSync("bun", ["packages/db/src/seed/native-cli.ts"], {
    env: { ...process.env, NATIVE_SEED_PREFIX: prefix },
  });
});

test("ログイン・開封再開・カード・対戦・履歴・ログアウト", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "アカウントをお持ちの方はログイン", exact: true }).click();
  await page.getByRole("textbox", { name: "メールアドレス" }).fill(`${prefix}1@example.com`);
  await page.getByRole("textbox", { name: "パスワード" }).fill("password1234");
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await expect(page.getByRole("button", { name: "基本パックを選ぶ", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "基本パックを選ぶ", exact: true }).click();
  await expect(page.getByRole("button", { name: "タップで開ける", exact: true })).toBeVisible();
  const opening = page.url();
  // 戻り先がある状態で、途中まで／最後まで切り口をなぞる。
  const tearArea = page.getByTestId("tear-area");
  const swipe = async (fraction: number) => {
    // 登場アニメーションが完了してから座標を取得する。
    await expect(async () => {
      const box = await tearArea.boundingBox();
      expect(box?.width).toBeCloseTo(256, 0);
    }).toPass();
    const box = (await tearArea.boundingBox())!;
    await page.mouse.move(box.x + 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * fraction, box.y + box.height / 2, { steps: 20 });
    await page.mouse.up();
  };
  await swipe(0.45);
  await expect(page).toHaveURL(opening);
  await expect(page.getByRole("button", { name: "タップで開ける", exact: true })).toBeVisible();
  await swipe(0.95);
  await expect(page.getByRole("button", { name: "次のカード", exact: true })).toBeVisible();
  await expect(page).toHaveURL(opening);
  await page.reload();
  await expect(page.getByRole("button", { name: "タップで開ける", exact: true })).toBeVisible();
  expect(page.url()).toBe(opening);
  await page.getByRole("button", { name: "タップで開ける", exact: true }).click();
  for (let i = 0; i < 5; i++)
    await page.getByRole("button", { name: "次のカード", exact: true }).click();
  await expect(page.getByText("開封結果", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "コレクションへ", exact: true }).click();
  await page.getByRole("button", { name: "並び順", exact: true }).click();
  await page.getByRole("button", { name: "攻撃力順", exact: true }).click();
  await page.getByRole("button", { name: "並び順", exact: true }).click();
  await page.getByRole("button", { name: "防御力順", exact: true }).click();
  await page.getByRole("tab", { name: /対戦/ }).click();
  await page.getByRole("button", { name: "練習対戦", exact: true }).first().click();
  await page.getByRole("button", { name: "このチームで試す", exact: true }).click();
  await expect(page.getByText(/チームの結果：/)).toBeVisible();
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await page.getByRole("button", { name: "編集", exact: true }).first().click();
  await page.getByRole("textbox", { name: "チーム名", exact: true }).fill("ネイティブ確認チーム");
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByText(/ネイティブ確認チーム/).first()).toBeVisible();
  await page.getByRole("button", { name: "編集", exact: true }).first().click();
  await page.getByRole("textbox", { name: "チーム名", exact: true }).fill("破棄する変更");
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await page.getByRole("button", { name: "変更を破棄", exact: true }).click();
  await expect(page.getByText(/ネイティブ確認チーム/).first()).toBeVisible();
  await page.getByRole("button", { name: "所持カードを強化", exact: true }).click();
  await page
    .getByRole("button", { name: /、攻撃 .*を選ぶ$/ })
    .first()
    .click();
  await page.getByRole("button", { name: "未強化をまとめて選択", exact: true }).click();
  await page.getByRole("button", { name: /選択した.*枚を確認/ }).click();
  await expect(page.getByText("強化内容を確認", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /枚を消費して強化/ }).click();
  await expect(page.getByText(/枚を素材にして強化しました/)).toBeVisible();
  // 成功表示は再取得の完了より先に出る。閉じる操作が有効になるまで待つ。
  await expect(page.getByRole("button", { name: "選択した0枚を確認", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
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

test("2人でフリマ購入・オークション入札・ポイント購入・カード還元", async ({ browser }) => {
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
  const inventoryResponse = await sellerContext.request.get(
    "http://localhost:3001/api/trpc/battle.inventory",
  );
  const inventory = (await inventoryResponse.json()).result.data as {
    id: string;
    cardId: string;
    inTeam: boolean;
  }[];
  const free = inventory.filter((c) => !c.inTeam);
  for (const [index, format] of ["fixed_price", "auction"].entries()) {
    await seller.goto(
      `http://localhost:8082/market/new?userCardId=${free[index]!.id}&cardId=${free[index]!.cardId}`,
    );
    if (format === "auction")
      await seller.getByRole("button", { name: "オークション", exact: true }).click();
    await seller
      .getByRole("textbox", {
        name: format === "auction" ? "開始価格（pt）" : "価格（pt）",
        exact: true,
      })
      .fill("100");
    await seller.getByRole("button", { name: "出品する", exact: true }).click();
    await expect(seller).toHaveURL(/\/market\/(?!new)[^/]+$/);
    const listing = seller.url();
    await buyer.goto(listing);
    if (format === "auction") await buyer.getByRole("textbox", { name: /入札額/ }).fill("100");
    await buyer
      .getByRole("button", { name: format === "auction" ? "入札" : "購入する", exact: true })
      .click();
    await buyer
      .getByRole("button", { name: format === "auction" ? "入札する" : "購入する", exact: true })
      .last()
      .click();
    await expect(
      buyer.getByText(format === "auction" ? "あなたが最高額です" : "あなたが購入しました", {
        exact: true,
      }),
    ).toBeVisible();
    await seller.reload();
    if (format === "auction")
      await expect(
        seller.getByRole("button", { name: "入札があるため取り下げられません", exact: true }),
      ).toBeDisabled();
    else await expect(seller.getByText("売り切れ", { exact: true })).toBeVisible();
  }
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
  const inventoryForRedeem = await buyerContext.request.get(
    "http://localhost:3001/api/trpc/battle.inventory",
  );
  const available = (
    (await inventoryForRedeem.json()).result.data as { cardId: string; inTeam: boolean }[]
  ).find((c) => !c.inTeam);
  expect(available).toBeDefined();
  await buyer.goto(`http://localhost:8082/cards/${available!.cardId}`);
  await buyer
    .getByRole("button", { name: /還元する .*pt/ })
    .first()
    .click();
  await buyer.getByRole("button", { name: "還元する", exact: true }).click();
  await expect(buyer.getByText("カードを還元します", { exact: true })).not.toBeVisible();
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
  await expect(page.getByText("無料パック 残り 10", { exact: true })).toBeVisible();
});
