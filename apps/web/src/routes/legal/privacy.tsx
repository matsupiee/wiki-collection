import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/legal/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="プライバシーポリシー" updatedAt="2026年10月25日">
      <p>
        ［運営者名］（以下「運営者」）は、「Wiki
        Collection」（以下「本サービス」）での利用者の個人情報を、次のとおり取り扱います。
      </p>
      <section>
        <h2>1. 取得する情報</h2>
        <ul>
          <li>
            アカウント情報:
            メールアドレス、ニックネーム、パスワード（ハッシュ化して保存し、運営者も元の値は知りません）
          </li>
          <li>
            利用状況: パックの開封、カードの所持・還元、マーケットでの出品・購入・入札、pt
            の獲得と使用の記録
          </li>
          <li>
            購入情報: pt の購入日時、商品、金額、決済サービスの取引
            ID（カード番号などの決済情報は決済サービスが管理し、運営者は保存しません）
          </li>
          <li>アクセス情報: IP アドレス、ブラウザの種類、ログイン日時</li>
        </ul>
      </section>
      <section>
        <h2>2. 利用目的</h2>
        <ul>
          <li>本サービスの提供、アカウントの認証</li>
          <li>pt の管理と、資金決済法にもとづく未使用残高の管理・報告</li>
          <li>マーケットでの取引の成立と、出品者名のほかの利用者への表示</li>
          <li>不正利用（複数アカウント、リアルマネートレードなど）の防止</li>
          <li>問い合わせへの対応、本サービスの改善</li>
        </ul>
      </section>
      <section>
        <h2>3. ほかの利用者に表示される情報</h2>
        <p>
          マーケットでは、出品者と入札者のニックネームがほかの利用者に表示されます。メールアドレスは表示しません。
        </p>
      </section>
      <section>
        <h2>4. 第三者への提供と委託</h2>
        <p>
          法令にもとづく場合を除き、本人の同意なく第三者に個人情報を提供しません。次の事業者に、業務に必要な範囲で取り扱いを委託します。
        </p>
        <ul>
          <li>
            Cloudflare,
            Inc.（サーバーとデータベースの提供。データは国外のサーバーに保存されることがあります）
          </li>
          <li>決済サービス事業者（pt の購入代金の決済）</li>
        </ul>
      </section>
      <section>
        <h2>5. 保存期間</h2>
        <p>
          アカウント情報は退会まで保存します。pt
          の獲得・使用と購入の記録は、法令で定める期間保存します。
        </p>
      </section>
      <section>
        <h2>6. 開示・訂正・削除の請求</h2>
        <p>
          利用者は、自身の個人情報の開示、訂正、利用停止、削除を請求できます。下記の窓口までご連絡ください。
        </p>
      </section>
      <section>
        <h2>7. 問い合わせ窓口</h2>
        <p>［運営者名］ ［メールアドレス］</p>
      </section>
    </LegalPage>
  );
}
