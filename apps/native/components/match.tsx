import { Text } from "./typography";
import { View } from "react-native";
import { Shield, Swords } from "lucide-react-native";
import {
  fight,
  duelDetails,
  type Fighter,
  type BattleRuleVersion,
} from "@wiki-collection/db/battle";
import { ElementBadge } from "./element";
export const outcome = (n: number) => (n > 0 ? "勝ち" : n < 0 ? "負け" : "引き分け");
const statNumber = (n: number) => n.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
const small = { fontSize: 12, lineHeight: 16, color: "#1e293b" };
export function Match({
  left,
  right,
  ruleVersion = 2,
  leftLabel = "自分",
}: {
  left: Fighter[];
  right: Fighter[];
  ruleVersion?: BattleRuleVersion;
  leftLabel?: string;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 16, lineHeight: 24, fontWeight: "700", color: "#075985" }}>
        チームの結果：{outcome(fight(left, right, ruleVersion))}
      </Text>
      {left.map((a, i) => {
        const b = right[i]!;
        const detail = duelDetails(a, b, ruleVersion);
        return (
          <View
            key={`${a.id}-${i}`}
            style={{ borderTopWidth: 1, borderColor: "#e2e8f0", paddingTop: 12 }}
          >
            <Text style={[small, { fontWeight: "700", marginBottom: 8 }]}>
              {i + 1}番手：{outcome(detail.result)}
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {[
                { c: a, h: detail.left, defense: b.defense },
                { c: b, h: detail.right, defense: a.defense },
              ].map(({ c, h, defense }, side) => (
                <View key={side} style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[small, { color: "#64748b" }]}>
                    {side === 0 ? leftLabel : "相手"}
                  </Text>
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}
                  >
                    <ElementBadge element={c.element} ruleVersion={ruleVersion} />
                    <Text style={[small, { fontWeight: "700", flex: 1, minWidth: 0 }]}>
                      {c.title}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flexWrap: "wrap",
                      marginTop: 8,
                      gap: 3,
                    }}
                  >
                    <Swords size={14} color="#ea580c" accessibilityLabel="攻撃" />
                    <Text style={small}>
                      {statNumber(c.attack)} × {h.multiplier}
                      {h.multiplier === 2 ? "（弱点）" : ""}
                    </Text>
                  </View>
                  <View
                    style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 3 }}
                  >
                    <Text style={small}>− 相手の</Text>
                    <Shield size={14} color="#0284c7" accessibilityLabel="防御" />
                    <Text style={small}>{statNumber(defense)}</Text>
                  </View>
                  <Text style={[small, { marginTop: 4, fontWeight: "700", color: "#075985" }]}>
                    ダメージ {statNumber(h.damage)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
      <Text style={[small, { color: "#64748b" }]}>
        同じ位置のダメージを比較します。最低ダメージは0、同値は引き分け。3組の勝ち数でチームの勝敗が決まります。
      </Text>
    </View>
  );
}
