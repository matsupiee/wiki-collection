import { useId } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Ellipse,
  RadialGradient,
  LinearGradient,
  Path,
  Pattern,
  Rect,
  Stop,
  Text,
} from "react-native-svg";

export const OPENING_PACK_RATIO = 1.72;

/** The opening-only wrapper: dark foil, orange heat seals and a diagonal printed panel. */
export function OpeningPack({ width }: { width: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <View style={{ width, height: width * OPENING_PACK_RATIO }}>
      <Svg width="100%" height="100%" viewBox="0 0 250 430">
        <Defs>
          <LinearGradient id={`${id}ink`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#292c32" />
            <Stop offset="0.32" stopColor="#4b4f57" />
            <Stop offset="0.59" stopColor="#454950" />
            <Stop offset="0.84" stopColor="#393d44" />
            <Stop offset="1" stopColor="#292c32" />
          </LinearGradient>
          <LinearGradient id={`${id}body`} x1="0" y1="0" x2="1" y2="0.7">
            <Stop offset="0" stopColor="#080a0f" />
            <Stop offset="0.3" stopColor="#161920" />
            <Stop offset="0.67" stopColor="#1d2028" />
            <Stop offset="1" stopColor="#090b10" />
          </LinearGradient>
          <LinearGradient id={`${id}orange`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#9e3c00" />
            <Stop offset="0.07" stopColor="#ee6800" />
            <Stop offset="0.45" stopColor="#ef7d06" />
            <Stop offset="0.92" stopColor="#ea6900" />
            <Stop offset="1" stopColor="#8f3200" />
          </LinearGradient>
          <LinearGradient id={`${id}print`} x1="0" y1="0" x2="1" y2="0.12">
            <Stop offset="0" stopColor="#983200" />
            <Stop offset="0.08" stopColor="#d85b00" />
            <Stop offset="0.2" stopColor="#ff7400" />
            <Stop offset="0.47" stopColor="#ff8402" />
            <Stop offset="0.8" stopColor="#ff7000" />
            <Stop offset="0.97" stopColor="#ff6400" />
            <Stop offset="1" stopColor="#d14b00" />
          </LinearGradient>
          <LinearGradient id={`${id}facet`} x1="0" y1="0" x2="1" y2="0.72">
            <Stop offset="0" stopColor="#2a1f24" stopOpacity="0" />
            <Stop offset="0.25" stopColor="#07090f" stopOpacity="0.14" />
            <Stop offset="0.36" stopColor="#151116" stopOpacity="0" />
            <Stop offset="0.48" stopColor="#c8b2a7" stopOpacity="0.048" />
            <Stop offset="0.57" stopColor="#8f7973" stopOpacity="0.025" />
            <Stop offset="0.63" stopColor="#070a11" stopOpacity="0.16" />
            <Stop offset="0.72" stopColor="#221b1f" stopOpacity="0.04" />
            <Stop offset="1" stopColor="#2a1f24" stopOpacity="0" />
          </LinearGradient>
          <RadialGradient id={`${id}seamLight`}>
            <Stop offset="0" stopColor="#f47816" stopOpacity="0.46" />
            <Stop offset="0.37" stopColor="#b54a11" stopOpacity="0.21" />
            <Stop offset="0.68" stopColor="#9e3c12" stopOpacity="0.08" />
            <Stop offset="1" stopColor="#833810" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id={`${id}creases`} x1="0" y1="0.3" x2="1" y2="0.45">
            <Stop offset="0" stopColor="#100e13" stopOpacity="0.28" />
            <Stop offset="0.045" stopColor="#351b14" stopOpacity="0.02" />
            <Stop offset="0.085" stopColor="#f7d2ad" stopOpacity="0.041" />
            <Stop offset="0.17" stopColor="#413637" stopOpacity="0" />
            <Stop offset="0.58" stopColor="#241f24" stopOpacity="0.09" />
            <Stop offset="0.81" stopColor="#efe1d9" stopOpacity="0.027" />
            <Stop offset="0.95" stopColor="#080a11" stopOpacity="0.1" />
            <Stop offset="1" stopColor="#080a11" stopOpacity="0.33" />
          </LinearGradient>
          <LinearGradient id={`${id}seal`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#e88508" />
            <Stop offset="0.2" stopColor="#ffbd19" />
            <Stop offset="0.53" stopColor="#ab4300" />
            <Stop offset="0.8" stopColor="#ffaf00" />
            <Stop offset="1" stopColor="#ffca38" />
          </LinearGradient>
          <LinearGradient id={`${id}crimpShadow`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#301311" stopOpacity="0" />
            <Stop offset="0.62" stopColor="#512615" stopOpacity="0.56" />
            <Stop offset="1" stopColor="#32130b" stopOpacity="0.96" />
          </LinearGradient>
          <LinearGradient id={`${id}bottomSeal`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#6c2905" />
            <Stop offset="0.33" stopColor="#ce5b06" />
            <Stop offset="0.69" stopColor="#852d00" />
            <Stop offset="1" stopColor="#ca5a04" />
          </LinearGradient>
          <RadialGradient id={`${id}heat`}>
            <Stop offset="0" stopColor="#fff4b3" stopOpacity="0.98" />
            <Stop offset="0.19" stopColor="#ffd146" stopOpacity="0.9" />
            <Stop offset="0.56" stopColor="#ff8500" stopOpacity="0.42" />
            <Stop offset="1" stopColor="#ff7500" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#7b818c" stopOpacity="0.5" />
            <Stop offset="0.035" stopColor="#07090e" stopOpacity="0" />
            <Stop offset="0.95" stopColor="#11141a" stopOpacity="0" />
            <Stop offset="1" stopColor="#6d7480" stopOpacity="0.36" />
          </LinearGradient>
          <Pattern id={`${id}ribs`} width="4.6" height="24" patternUnits="userSpaceOnUse">
            <Path d="M1 0 0 24" stroke="#4c2108" strokeOpacity="0.7" strokeWidth="1.6" />
            <Path d="M2.4 0 1.4 24" stroke="#ffe471" strokeOpacity="0.6" strokeWidth="0.7" />
          </Pattern>
          <ClipPath id={`${id}clip`}>
            <Path d="M3 18 Q125 26 247 18 L245 411 Q125 418 5 411 Z" />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${id}clip)`}>
          <Rect x="3" y="16" width="244" height="400" fill={`url(#${id}body)`} />
          <Path d="M6 268 246 320 246 404 4 404Z" fill={`url(#${id}print)`} />
          <Rect x="3" y="23" width="244" height="384" fill={`url(#${id}creases)`} />
          <Rect x="3" y="23" width="244" height="377" fill={`url(#${id}facet)`} />
          <Ellipse cx="140" cy="27" rx="160" ry="52" fill={`url(#${id}seamLight)`} />
          <Path
            d="M18 35 45 44 32 80 65 57 M208 42 228 32 218 95 201 112 M13 136 35 153 43 133 M185 150 211 132 221 97 M35 224 21 246 35 270 M198 240 217 222 230 250 M22 320 13 357 20 391 M231 333 224 372 235 400"
            fill="none"
            stroke="#9098a5"
            strokeOpacity="0.055"
            strokeWidth="2.2"
          />
          <Path
            d="M52 78 69 56 M202 114 215 99 M43 132 51 147 M211 223 220 210 M41 233 26 249 M37 98 43 124 M173 268 204 242"
            fill="none"
            stroke="#000"
            strokeOpacity="0.12"
            strokeWidth="2"
          />
          <Rect x="3" y="20" width="244" height="392" fill={`url(#${id}rim)`} />
          <Path d="M6 268 246 320 246 404 4 404Z" fill={`url(#${id}print)`} opacity="0.62" />
          <G transform="translate(0 18)">
            <Path
              d="M116 49 120 62 125 52 130 62 134 49 M118 49 122 49 125 57 128 49 132 49"
              fill="none"
              stroke="#c78637"
              strokeWidth="1.7"
            />
            <Path d="M85 73 169 73 162 86 78 86Z" fill="#e7780d" />
            <Text
              x="124"
              y="82"
              textAnchor="middle"
              fill="#ffe6b3"
              fontSize="7"
              fontWeight="800"
              letterSpacing="1.3"
            >
              COLLECTION
            </Text>
          </G>
          <Text
            x="125"
            y="213"
            textAnchor="middle"
            fontFamily="Helvetica Neue"
            fill={`url(#${id}ink)`}
            fontSize="20"
            fontWeight="800"
            letterSpacing="3.1"
          >
            WIKI COLLECTION
          </Text>
          <G transform="translate(127 291) scale(1.05) translate(-125 -302)">
            <Circle cx="125" cy="302" r="45" fill="#171b23" stroke="#c4c6c9" strokeWidth="2.4" />
            <Path d="M81 302 A44 44 0 0 1 169 302 L169 310 81 292Z" fill={`url(#${id}orange)`} />
            <Circle cx="125" cy="302" r="43.2" fill="none" stroke="#f7dca9" strokeOpacity="0.38" />
            <Circle cx="125" cy="302" r="20" fill="#171b23" stroke="#dce0e6" strokeWidth="2" />
            <Path
              d="M125 292 Q118 287 112 291 L112 311 Q119 307 125 312 Q131 307 138 311 L138 291 Q132 287 125 292 V312"
              fill="#d6dce5"
              stroke="#171b23"
              strokeWidth="1.5"
            />
          </G>
          <Text
            x="32"
            y="376"
            fontFamily="Helvetica Neue"
            fill="#ffe2a4"
            fontSize="10.1"
            fontWeight="900"
            letterSpacing="2.0"
          >
            WIKI GACHA
          </Text>
          <Text
            x="113"
            y="376"
            fontFamily="Helvetica Neue"
            fill="#352013"
            fontSize="10.3"
            fontWeight="900"
            letterSpacing="3.7"
          >
            STARTER PACK
          </Text>
        </G>
        <Rect x="6" y="385" width="239" height="18" fill={`url(#${id}crimpShadow)`} />
        {[
          { y: 1, h: 30, top: true },
          { y: 397, h: 30, top: false },
        ].map(({ y, h, top }) => (
          <G key={y}>
            <Path
              d={`M2 ${y + 2} Q125 ${y - 2} 248 ${y + 2} L247 ${y + h} Q125 ${y + h + 4} 3 ${y + h}Z`}
              fill={`url(#${id}${top ? "seal" : "bottomSeal"})`}
            />
            <Rect
              x="4"
              y={y + 2}
              width="242"
              height={h - 2}
              opacity={top ? 1 : 0.48}
              fill={`url(#${id}ribs)`}
            />
            <Path
              d={`M4 ${y + h} Q125 ${y + h + 4} 246 ${y + h}`}
              stroke={top ? "#ffce40" : "#ae5105"}
              strokeWidth="1.3"
              fill="none"
            />
          </G>
        ))}
        <Ellipse cx="155" cy="32" rx="71" ry="16" fill={`url(#${id}heat)`} />
      </Svg>
    </View>
  );
}
