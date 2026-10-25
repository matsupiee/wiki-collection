import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/legal/payment-services")({
  component: PaymentServicesPage,
});

function PaymentServicesPage() {
  return (
    <LegalPage title="資金決済法に基づく表示" updatedAt="2026年10月25日">
      <p>
        本サービスで販売する pt
        は、資金決済に関する法律に定める前払式支払手段（自家型）にあたります。
      </p>
      <table>
        <tbody>
          <tr>
            <th>名称</th>
            <td>pt（有償 pt）</td>
          </tr>
          <tr>
            <th>発行者</th>
            <td>［運営者名］</td>
          </tr>
          <tr>
            <th>支払可能金額</th>
            <td>購入した pt の額（1pt 単位）。保有できる有償 pt の上限は［上限額］pt です。</td>
          </tr>
          <tr>
            <th>有効期間</th>
            <td>なし</td>
          </tr>
          <tr>
            <th>使用できる場所</th>
            <td>本サービス内の有料パックの開封、マーケットでのカードの購入・入札</td>
          </tr>
          <tr>
            <th>使用の順序</th>
            <td>無償 pt を先に使い、そのあと有償 pt を購入日の古いものから使います。</td>
          </tr>
          <tr>
            <th>払い戻し</th>
            <td>
              法令で定める場合を除き、払い戻しはしません。本サービスの提供を終了する場合は、法令に従い未使用の有償
              pt を払い戻します。
            </td>
          </tr>
          <tr>
            <th>未使用残高の確認</th>
            <td>ショップ画面と「pt の履歴」画面で確認できます。</td>
          </tr>
          <tr>
            <th>利用者資金の保全</th>
            <td>
              基準日の未使用残高が1,000万円を超えた場合、その半額以上を法務局に供託するなどして保全します。
            </td>
          </tr>
          <tr>
            <th>問い合わせ窓口</th>
            <td>［メールアドレス］</td>
          </tr>
          <tr>
            <th>利用上の注意</th>
            <td>pt を本サービスの外で売買することは利用規約で禁止しています。</td>
          </tr>
        </tbody>
      </table>
    </LegalPage>
  );
}
