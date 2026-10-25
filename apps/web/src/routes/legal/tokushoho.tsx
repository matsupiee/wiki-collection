import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/legal/tokushoho")({
  component: TokushohoPage,
});

function TokushohoPage() {
  return (
    <LegalPage title="特定商取引法に基づく表記" updatedAt="2026年10月25日">
      <table>
        <tbody>
          <tr>
            <th>販売事業者</th>
            <td>［運営者名］</td>
          </tr>
          <tr>
            <th>運営責任者</th>
            <td>［氏名］</td>
          </tr>
          <tr>
            <th>所在地</th>
            <td>［住所］</td>
          </tr>
          <tr>
            <th>連絡先</th>
            <td>［メールアドレス］（電話番号は請求があれば遅滞なく開示します）</td>
          </tr>
          <tr>
            <th>販売価格</th>
            <td>ショップ画面に商品ごとに表示します（例: 1,000pt $10.00）。</td>
          </tr>
          <tr>
            <th>商品代金以外の必要料金</th>
            <td>インターネット接続にかかる通信料</td>
          </tr>
          <tr>
            <th>支払方法</th>
            <td>クレジットカード（決済サービスを通じて支払います）</td>
          </tr>
          <tr>
            <th>支払時期</th>
            <td>購入手続きの完了時</td>
          </tr>
          <tr>
            <th>引渡時期</th>
            <td>決済の完了後、ただちに pt を付与します。</td>
          </tr>
          <tr>
            <th>返品・キャンセル</th>
            <td>
              デジタルコンテンツの性質上、購入後の返品・キャンセルはできません。pt
              の払い戻しは、法令で定める場合を除き行いません。
            </td>
          </tr>
          <tr>
            <th>動作環境</th>
            <td>最新版の Chrome、Safari、Edge、Firefox</td>
          </tr>
          <tr>
            <th>販売数量の制限</th>
            <td>未成年の利用者は、年齢に応じて1か月に購入できる金額の上限があります。</td>
          </tr>
        </tbody>
      </table>
    </LegalPage>
  );
}
