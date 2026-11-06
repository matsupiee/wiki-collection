import type { PropsWithChildren } from "react";
import { View, StyleSheet } from "react-native";
import { Swords, Shield } from "lucide-react-native";
import { affinityRules, elementLabels } from "@wiki-collection/db/battle";
import { Text } from "./typography";
const s = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 22.75, color: "#475569" },
  heading: {
    fontSize: 14,
    lineHeight: 22.75,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
});
function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View>
      <Text style={s.heading}>{title}</Text>
      {children}
    </View>
  );
}
export function BattleHelpContent() {
  return (
    <View style={{ gap: 24 }}>
      <Section title="1. 3枚でチームを作ろう">
        <Text style={s.body}>
          「チームを編成」から所持カードを3枚選び、名前と並び順を決めて保存します。最大3チームまで作れ、同じ所持カードを別のチームにも使えます。能力値が未計測のカードは編成できません。
        </Text>
      </Section>
      <Section title="2. 同じ番手どうしで勝負">
        <Text style={s.body}>
          1番手・2番手・3番手がそれぞれ同時に攻撃し、与えるダメージを比べます。
        </Text>
        <View
          style={{ marginVertical: 8, padding: 12, borderRadius: 12, backgroundColor: "#f8fafc" }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Swords size={14} color="#ea580c" />
            <Text style={[s.body, { color: "#0f172a" }]}>× 相性倍率 − 相手の</Text>
            <Shield size={14} color="#0284c7" />
          </View>
          <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 19.5, color: "#64748b" }}>
            ダメージの最低値は0です。
          </Text>
        </View>
        <Text style={s.body}>
          ダメージが大きいカードの勝ち。同じなら引き分けです。3組のうち勝った数が多いチームが勝利し、勝った数が同じならチームも引き分けになります。
        </Text>
      </Section>
      <Section title="3. 属性の相性を活かそう">
        <Text style={s.body}>
          次の矢印の方向に弱点を突くと、
          <Swords size={14} color="#ea580c" /> が2倍になります。
        </Text>
        <View
          style={{
            marginVertical: 8,
            padding: 12,
            borderRadius: 12,
            backgroundColor: "#f0f9ff",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {affinityRules.map(({ from, to }) => (
            <Text key={from} style={[s.body, { width: "47%", color: "#075985" }]}>
              {elementLabels[from]} → {elementLabels[to]}
            </Text>
          ))}
        </View>
        <Text style={s.body}>
          それ以外は1倍で、総合は有利・不利がありません。カードの属性アイコンから相性図も確認できます。相性はゲームのルールで、現実の優劣を意味しません。
        </Text>
      </Section>
      <Section title="4. まずは練習対戦">
        <Text style={s.body}>
          保存したチームの「練習対戦」で、サンプルや最新結果の他プレイヤーのチームを相手に試せます。カード・ptの消費や報酬はなく、ランキングにも影響しません。結果の内訳を見て、カードや並び順を工夫しましょう。
        </Text>
      </Section>
      <Section title="5. 毎日の自動対戦とランキング">
        <Text style={s.body}>
          保存したチームは毎日日本時間0時に、他プレイヤーの全チームと自動で対戦します。自分のチームどうしは対戦しません。
        </Text>
        <Text style={[s.body, { marginTop: 8 }]}>
          勝ち3点・引き分け1点・負け0点。勝点率（勝点 ÷ 対戦数 ÷
          3）で順位が決まり、同率は同順位です。対戦報酬はありません。「ランキング」の行を押すと、その日のカードと対戦の内訳を確認できます。
        </Text>
      </Section>
      <Section title="もっと強くしたいときは">
        <Text style={s.body}>
          カード右側の強化ボタンや「所持カードを強化」から、素材カードを使って能力値を上げられます。ptは消費しませんが、素材にしたカードはなくなり、元に戻せません。編成中のカードは還元・出品・素材への利用ができません。
        </Text>
      </Section>
    </View>
  );
}
