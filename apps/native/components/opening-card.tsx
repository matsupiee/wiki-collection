import { useId, useState } from "react";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Defs,
  ClipPath,
  G,
  LinearGradient as SvgGradient,
  Stop,
  Path,
  Rect,
} from "react-native-svg";
import { cardImageDisplayUrl } from "@wiki-collection/db/card-image";
import { apiUrl } from "../lib/client";
import { Text } from "./typography";

export const openingColors: Record<string, string> = {
  common: "#d8edff",
  uncommon: "#6fe9da",
  rare: "#8fa9ff",
  double_rare: "#f682ff",
  legendary: "#ff692e",
};
export const openingRarityNames: Record<string, string> = {
  common: "COMMON",
  uncommon: "UNCOMMON",
  rare: "RARE",
  double_rare: "DOUBLE RARE",
  legendary: "LEGENDARY",
};
export type OpeningCardData = {
  title: string;
  imageUrl: string | null;
  rarity: string;
  summary?: string | null;
  genreName?: string;
  monthlyPageviews?: number;
};

export const OPENING_CARD_RATIO = 1.65;

// Continuous paths avoid the visible horizontal join produced by tiling SVG chevrons.
const foilGrooves = (offset: number, edge: boolean) =>
  Array.from({ length: 12 }, (_, i) => {
    const y = i * 52 - 140 + offset;
    return edge
      ? `M-52 ${y + 52} l52 -52 26 -26 26 26 68 -68 68 68 26 -26 26 26 52 52`
      : `M-120 ${y - 120} l240 240 240 -240`;
  }).join(" ");
const grooves = [false, true].map((edge) => ({
  region: edge ? "edge" : "middle",
  ridge: foilGrooves(0, edge),
  trough: foilGrooves(26, edge),
  lip: foilGrooves(-9, edge),
}));
const rainbowColors = [
  "#c260eb",
  "#c94b7c",
  "#cc6b5a",
  "#9dc54b",
  "#30c34e",
  "#2bbca0",
  "#2b87f5",
  "#5953c8",
];
const rainbowStops = Array.from(
  { length: rainbowColors.length * 3 + 1 },
  (_, i) => rainbowColors[i % rainbowColors.length]!,
);

// The pigment moves underneath stationary embossed paths. Translating a periodic
// gradient changes its hue on the UI thread while preserving every groove and highlight.
function MovingFoil({ width, phase }: { width: number; phase: SharedValue<number> }) {
  const id = useId().replace(/:/g, "");
  const height = width * OPENING_CARD_RATIO;
  const period = width / 0.44;
  const cyclesX = 1 / period;
  const cyclesY = 0.32 / height;
  const norm = cyclesX ** 2 + cyclesY ** 2;
  const belt = useAnimatedStyle(() => {
    const cycles = phase.get();
    return { transform: [{ translateX: (cycles - Math.floor(cycles)) * period }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", left: -period, top: 0, width: width + period + 1, height },
        belt,
      ]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <SvgGradient
            id={id}
            gradientUnits="userSpaceOnUse"
            x1={0}
            y1={0}
            x2={(3 * cyclesX) / norm}
            y2={(3 * cyclesY) / norm}
          >
            {rainbowStops.map((color, i) => (
              <Stop key={i} offset={i / (rainbowStops.length - 1)} stopColor={color} />
            ))}
          </SvgGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

export function OpeningCardBack({
  width,
  rainbow = false,
  foilPhase,
}: {
  width: number;
  rainbow?: boolean;
  foilPhase?: SharedValue<number>;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <View
      style={{
        width,
        height: width * OPENING_CARD_RATIO,
        borderRadius: width * 0.022,
        overflow: "hidden",
      }}
    >
      {rainbow && foilPhase && <MovingFoil width={width} phase={foilPhase} />}
      <Svg width="100%" height="100%" viewBox="0 0 240 396">
        <Defs>
          <ClipPath id={`${id}edge`}>
            <Rect x="0" y="0" width="78" height="68" />
            <Rect x="162" y="0" width="78" height="68" />
          </ClipPath>
          <ClipPath id={`${id}middle`}>
            <Rect x="0" y="68" width="240" height="130" />
            <Rect x="78" y="0" width="84" height="68" />
          </ClipPath>
          <SvgGradient
            id={`${id}foil`}
            x1="0"
            y1="0"
            x2={rainbow ? 1.13 : 0.08}
            y2={rainbow ? 0.82 : 1}
          >
            {(rainbow
              ? ["#c260eb", "#c94b7c", "#cc6b5a", "#9dc54b", "#30c34e", "#2bbca0", "#2b87f5"]
              : ["#b0afc5", "#999ab0", "#9196ae", "#7080a0", "#627395"]
            ).map((color, i, list) => (
              <Stop key={i} offset={i / (list.length - 1)} stopColor={color} />
            ))}
          </SvgGradient>
          <SvgGradient id={`${id}shine`} x1="0" y1="0" x2="1" y2="0.2">
            <Stop offset="0" stopColor="#fff" stopOpacity="0" />
            <Stop offset="0.27" stopColor="#fff" stopOpacity="0" />
            <Stop offset="0.4" stopColor="#fff" stopOpacity={rainbow ? "0.15" : "0.53"} />
            <Stop offset="0.51" stopColor="#fff" stopOpacity="0.05" />
            <Stop offset="0.77" stopColor="#fff" stopOpacity="0" />
            <Stop offset="0.9" stopColor="#fff" stopOpacity={rainbow ? 0.13 : 0.33} />
            <Stop offset="1" stopColor="#fff" stopOpacity="0" />
          </SvgGradient>
        </Defs>
        {(!rainbow || !foilPhase) && <Rect width="240" height="396" fill={`url(#${id}foil)`} />}
        {[false, true].map((mirror) => (
          <G key={String(mirror)} transform={mirror ? "translate(0 396) scale(1 -1)" : undefined}>
            {grooves.map(({ region, ridge, trough, lip }) => (
              <G key={region} clipPath={`url(#${id}${region})`}>
                <Path
                  d={ridge}
                  fill="none"
                  stroke="#f5f6ff"
                  strokeOpacity={rainbow ? 0.2 : 0.22}
                  strokeWidth="17"
                />
                <Path
                  d={trough}
                  fill="none"
                  stroke="#323351"
                  strokeOpacity={rainbow ? 0.28 : 0.21}
                  strokeWidth="14"
                />
                <Path
                  d={lip}
                  fill="none"
                  stroke="white"
                  strokeOpacity={rainbow ? 0.07 : 0.18}
                  strokeWidth="1"
                />
              </G>
            ))}
          </G>
        ))}
        <Rect width="240" height="396" fill={`url(#${id}shine)`} />
        <Path
          d="M74 166 93 228 119 183 146 228 166 166 M87 166 97 197 119 158 141 197 151 166 M69 152H171 M72 145H168"
          fill="none"
          stroke="#28334e"
          strokeOpacity="0.42"
          strokeWidth="5.5"
          strokeLinejoin="miter"
        />
        <Path
          d="M72 164 91 226 117 181 144 226 164 164 M85 164 95 195 117 156 139 195 149 164 M67 150H169 M70 143H166"
          fill="none"
          stroke="#f6f8ff"
          strokeOpacity={rainbow ? 0.94 : 0.72}
          strokeWidth="2.8"
          strokeLinejoin="miter"
        />
        <Rect
          x="0.7"
          y="0.7"
          width="238.6"
          height="394.6"
          rx="5"
          fill="none"
          stroke="#eff3ff"
          strokeOpacity="0.48"
          strokeWidth="1.4"
        />
      </Svg>
    </View>
  );
}

export function openingFaceRatio(rarity: string) {
  return rarity === "double_rare" || rarity === "legendary" ? OPENING_CARD_RATIO : 1.43;
}

export function OpeningCardFace({ card, width }: { card: OpeningCardData; width: number }) {
  const cased = openingFaceRatio(card.rarity) === OPENING_CARD_RATIO;
  const innerWidth = cased ? width * 0.89 : width;
  const face = <PrintedCard key={card.title} card={card} width={innerWidth} fullArt={cased} />;
  if (!cased) return face;

  // A clear archive sleeve gives the rarer pull a different silhouette, even at thumbnail size.
  return (
    <LinearGradient
      colors={["#ebe8e6", "#827f85", "#bcb9bd", "#dddadd", "#665e65"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width,
        height: width * OPENING_CARD_RATIO,
        alignItems: "center",
        justifyContent: "space-evenly",
        borderRadius: width * 0.035,
        borderWidth: 1,
        borderColor: "#d5d3d6",
      }}
    >
      <View
        style={{
          width: innerWidth,
          height: width * 0.18,
          borderWidth: Math.max(1, width * 0.012),
          borderColor: "#c34443",
          borderRadius: width * 0.009,
          backgroundColor: "#e2ddd7",
          justifyContent: "center",
          paddingHorizontal: width * 0.025,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: "#39373c",
            fontSize: width * 0.044,
            lineHeight: width * 0.058,
            fontWeight: "900",
          }}
        >
          WIKI COLLECTION
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: "#685957",
            fontSize: width * 0.028,
            lineHeight: width * 0.04,
            letterSpacing: width * 0.002,
            fontWeight: "800",
          }}
        >
          {openingRarityNames[card.rarity]}　/　ARCHIVE
        </Text>
      </View>
      {face}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: width * 0.033,
            borderWidth: Math.max(1, width * 0.012),
            borderColor: "#ffffff48",
          },
        ]}
      />
    </LinearGradient>
  );
}

function PrintedCard({
  card,
  width,
  fullArt,
}: {
  card: OpeningCardData;
  width: number;
  fullArt: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const accent = openingColors[card.rarity] ?? openingColors.common!;
  const title = card.title;
  const imageUri =
    !failed && card.imageUrl ? new URL(cardImageDisplayUrl(card.imageUrl), apiUrl).href : null;
  const bleed = fullArt && !!imageUri;
  const views = card.monthlyPageviews;
  const hasViews = typeof views === "number" && Number.isFinite(views);
  return (
    <LinearGradient
      colors={["#e6e7eb", "#8896a1", "#bdd0d8", "#596979"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{ width, height: width * 1.43, padding: width * 0.024, borderRadius: width * 0.025 }}
    >
      <LinearGradient
        colors={["#203d49", "#244655", "#142b36", "#152e3a"]}
        style={{
          flex: 1,
          paddingHorizontal: width * 0.028,
          paddingVertical: width * 0.015,
          borderRadius: width * 0.014,
          borderWidth: 0.7,
          borderColor: accent,
          overflow: "hidden",
        }}
      >
        {bleed && (
          <>
            <Image
              source={{ uri: imageUri! }}
              onError={() => setFailed(true)}
              resizeMode="cover"
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              pointerEvents="none"
              colors={["#0a151d00", "#0a151d00", "#0a151d9c", "#0a151dfa"]}
              locations={[0, 0.43, 0.72, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ flex: 1 }} />
          </>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", height: width * 0.101 }}>
          <Text
            numberOfLines={1}
            style={{ color: "#faf7ec", fontSize: width * 0.056, fontWeight: "900", flex: 1 }}
          >
            {title}
          </Text>
          <Text style={{ color: accent, fontSize: width * 0.047, marginLeft: width * 0.02 }}>
            ✦
          </Text>
        </View>
        {!bleed && (
          <View
            style={{
              height: width * 0.69,
              backgroundColor: "#253c49",
              borderWidth: 1,
              borderColor: "#b5ced5a0",
              overflow: "hidden",
            }}
          >
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                onError={() => setFailed(true)}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: accent, fontSize: width * 0.24 }}>
                  {Array.from(title)[0]}
                </Text>
              </View>
            )}
          </View>
        )}
        <Text
          numberOfLines={1}
          style={{
            color: accent,
            fontSize: width * 0.039,
            lineHeight: width * 0.057,
            marginTop: width * 0.03,
            fontWeight: "800",
          }}
        >
          {card.genreName ?? "KNOWLEDGE"}
        </Text>
        <Text
          numberOfLines={3}
          style={{
            color: "#e3eaeb",
            fontSize: width * 0.034,
            lineHeight: width * 0.05,
            marginTop: width * 0.013,
          }}
        >
          {card.summary || "知らなかった世界が、コレクションになる。"}
        </Text>
        {hasViews && (
          <View
            style={{
              marginTop: bleed ? width * 0.024 : "auto",
              marginBottom: width * 0.025,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderTopWidth: 0.5,
              borderColor: "#bed1d233",
              paddingTop: width * 0.019,
            }}
          >
            <Text numberOfLines={1} style={{ color: "#b7c9cb", fontSize: width * 0.032 }}>
              月間閲覧数
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: "#edf3ed", fontSize: width * 0.037, fontWeight: "800" }}
            >
              {views.toLocaleString("ja-JP")} 回
            </Text>
          </View>
        )}
        <View
          style={{
            marginTop: hasViews || bleed ? 0 : "auto",
            flexDirection: "row",
            justifyContent: "space-between",
            borderTopWidth: 0.5,
            borderColor: "#bdcfd25c",
            paddingTop: width * 0.016,
          }}
        >
          <Text style={{ color: "#bcc9cb", fontSize: width * 0.023 }}>WIKI COLLECTION</Text>
          <Text style={{ color: accent, fontSize: width * 0.026, fontWeight: "800" }}>
            {openingRarityNames[card.rarity]}
          </Text>
        </View>
      </LinearGradient>
    </LinearGradient>
  );
}
