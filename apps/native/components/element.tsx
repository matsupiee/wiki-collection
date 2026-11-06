import { useState, useId } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Path, Defs, Marker, G, Text as SvgText } from "react-native-svg";
import { Swords, Shield } from "lucide-react-native";
import {
  affinityRules,
  legacyAffinityRules,
  legacyWeakness,
  weakness,
  elementLabels,
  type HistoricalElement,
  type BattleRuleVersion,
} from "@wiki-collection/db/battle";
import { Text } from "./typography";
import { BattleSheet } from "./battle-sheet";
import { ElementSymbol, appearances } from "./element-symbol";
export function ElementBadge({
  element,
  ruleVersion = 2,
}: {
  element: HistoricalElement;
  ruleVersion?: BattleRuleVersion;
}) {
  const [open, setOpen] = useState(false);
  const id = useId().replace(/:/g, "");
  const { width } = useWindowDimensions();
  const elemental = ["fire", "water", "grass"].includes(element);
  const historical = elemental || element === "technology" || ruleVersion === 1;
  const rules: readonly { from: HistoricalElement; to: HistoricalElement }[] = elemental
    ? [
        { from: "fire", to: "grass" },
        { from: "grass", to: "water" },
        { from: "water", to: "fire" },
      ]
    : historical
      ? legacyAffinityRules
      : affinityRules;
  const weakTo = (historical ? legacyWeakness : weakness)[element];
  const strongAgainst = rules.find((r) => r.from === element)?.to;
  const point = (angle: number) => ({
    x: 180 + 118 * Math.cos(angle),
    y: 180 + 118 * Math.sin(angle),
  });
  const step = (Math.PI * 2) / rules.length;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${elementLabels[element]}属性の相性を見る`}
        onPress={() => setOpen(true)}
      >
        <ElementSymbol element={element} compact />
      </Pressable>
      <BattleSheet
        visible={open}
        title={historical ? "旧属性の相性" : "属性の相性"}
        onClose={() => setOpen(false)}
      >
        <Text style={{ fontSize: 14, lineHeight: 22.75, color: "#475569" }}>
          矢印の先の属性には、
          <Swords size={14} color="#ea580c" /> が2倍になります。それ以外の組み合わせは等倍です。
        </Text>
        <Svg
          viewBox="0 0 360 360"
          width="100%"
          height={Math.min(360, width - 40)}
          style={{ maxWidth: 360, alignSelf: "center" }}
          accessibilityLabel="属性の相性図"
        >
          <Defs>
            <Marker
              id={`${id}-arrow`}
              viewBox="0 0 10 10"
              refX={8}
              refY={5}
              markerWidth={6}
              markerHeight={6}
              orient="auto-start-reverse"
            >
              <Path
                d="M 1 1 L 9 5 L 1 9"
                fill="none"
                stroke="#94a3b8"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Marker>
            <Marker
              id={`${id}-selected-arrow`}
              viewBox="0 0 10 10"
              refX={8}
              refY={5}
              markerWidth={6}
              markerHeight={6}
              orient="auto-start-reverse"
            >
              <Path
                d="M 1 1 L 9 5 L 1 9"
                fill="none"
                stroke="#7c3aed"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Marker>
          </Defs>
          {rules.map((r, i) => {
            const angle = -Math.PI / 2 + step * i;
            const start = point(angle + 0.39),
              end = point(angle + step - 0.39);
            return (
              <Path
                key={r.from}
                d={`M ${start.x} ${start.y} A 118 118 0 0 1 ${end.x} ${end.y}`}
                fill="none"
                stroke={r.from === element ? "#7c3aed" : "#94a3b8"}
                strokeWidth={r.from === element ? 3 : 2}
                markerEnd={`url(#${id}-${r.from === element ? "selected-arrow" : "arrow"})`}
              />
            );
          })}
          <SvgText
            x={180}
            y={170}
            textAnchor="middle"
            fill="#64748b"
            fontSize={12}
            fontFamily="MPLUSRounded1c_400Regular"
          >
            矢印の先に
          </SvgText>
          <G transform="translate(143 178)">
            <Swords size={20} color="#ea580c" />
          </G>
          <SvgText
            x={190}
            y={195}
            textAnchor="middle"
            fill="#0f172a"
            fontSize={20}
            fontFamily="MPLUSRounded1c_700Bold"
          >
            2倍
          </SvgText>
          {rules.map((r, i) => {
            const { x, y } = point(-Math.PI / 2 + step * i);
            const { Icon, color } = appearances[r.from];
            return (
              <G key={r.from}>
                <Circle cx={x} cy={y} r={37} fill="white" />
                <Circle cx={x} cy={y} r={37} fill={color} fillOpacity={0.09} />
                {r.from === element && (
                  <Circle cx={x} cy={y} r={40} fill="none" stroke={color} strokeWidth={2} />
                )}
                <G transform={`translate(${x - 14} ${y - 25})`}>
                  <Icon size={28} color={color} />
                </G>
                <SvgText
                  x={x}
                  y={y + 23}
                  textAnchor="middle"
                  fill={color}
                  fontSize={13}
                  fontFamily="MPLUSRounded1c_700Bold"
                >
                  {elementLabels[r.from].replace("旧属性・", "")}
                </SvgText>
              </G>
            );
          })}
        </Svg>
        <View style={{ borderRadius: 16, backgroundColor: "#f8fafc", padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <ElementSymbol element={element} />
            <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "700", color: "#0f172a" }}>
              {elementLabels[element]}
            </Text>
          </View>
          {strongAgainst && weakTo ? (
            <Text style={{ fontSize: 14, lineHeight: 22.75, color: "#0f172a" }}>
              {elementLabels[strongAgainst]}への <Swords size={14} color="#ea580c" /> が2倍。{"\n"}
              {elementLabels[weakTo]}から受ける <Swords size={14} color="#ea580c" /> も2倍です。
            </Text>
          ) : (
            <Text style={{ fontSize: 14, lineHeight: 20, color: "#0f172a" }}>
              総合は、どの属性とも相性倍率がなく、
              <Swords size={14} color="#ea580c" /> ・受ける <Swords size={14} color="#ea580c" />{" "}
              とも等倍です。
            </Text>
          )}
        </View>
        <Text style={{ fontSize: 12, lineHeight: 19.5, color: "#64748b" }}>
          {historical
            ? "過去に保存された対戦のルールです。現在のカードには適用されません。"
            : "総合には有利・不利がありません。"}
          倍率は <Shield size={14} color="#0284c7" /> を引く前の{" "}
          <Swords size={14} color="#ea580c" />{" "}
          にかかります。相性はゲーム上のルールで、現実の優劣を示すものではありません。
        </Text>
      </BattleSheet>
    </>
  );
}
