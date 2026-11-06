import { useId } from "react";
import { View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Path,
  G,
  Mask,
  ClipPath,
  Pattern,
  Text as SvgText,
} from "react-native-svg";
const folds =
  "M-40 10 90 140 48 182 -20 114 M85 -30 220 105 187 138 262 213 M165 -30 115 20 220 125 M-30 220 38 152 140 254 98 296 -12 186 M275 210 220 265 162 207 119 250 244 375 M-20 330 52 258 150 356 108 398 M60 -20 15 25 135 145 M240 30 202 68";
// Webの箔袋と同じ構図・折り目を、ネイティブでも描けるSVGで表現する。
export function Pack({
  color,
  label,
  reflection = false,
  width = 192,
}: {
  color: string;
  label?: string;
  reflection?: boolean;
  width?: number;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <View
      style={{
        width: reflection ? 176 : width,
        height: (reflection ? 176 : width) * 1.6,
        boxShadow: reflection ? undefined : "0 14px 12px #0b122050",
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 250 400">
        <Defs>
          <Pattern
            id={`${id}ribs`}
            patternUnits="userSpaceOnUse"
            width={(4 * 250) / (reflection ? 176 : width)}
            height="24"
          >
            <Rect width={250 / (reflection ? 176 : width)} height="24" fill="#000" opacity=".47" />
            <Rect
              x={250 / (reflection ? 176 : width)}
              width={250 / (reflection ? 176 : width)}
              height="24"
              fill="white"
              opacity=".53"
            />
          </Pattern>
          <LinearGradient id={`${id}foldLight`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset=".36" stopColor="white" stopOpacity="0" />
            <Stop offset=".365" stopColor="white" stopOpacity=".45" />
            <Stop offset=".38" stopColor="white" stopOpacity="0" />
            <Stop offset=".70" stopColor="black" stopOpacity="0" />
            <Stop offset=".71" stopColor="black" stopOpacity=".4" />
            <Stop offset=".73" stopColor="black" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id={`${id}fade`} x2="0" y2="1">
            <Stop offset="0" stopColor="white" stopOpacity="0" />
            <Stop offset=".23" stopColor="white" />
          </LinearGradient>
          <Mask id={`${id}reflection`}>
            <Rect width="250" height="400" fill={`url(#${id}fade)`} />
          </Mask>
          <ClipPath id={`${id}clip`}>
            <Rect x="2.5" y="20" width="245" height="360" rx="4" />
          </ClipPath>
          <LinearGradient id={`${id}edge`} x1="0" y1=".4" x2="1" y2=".6">
            <Stop offset="0" stopColor="#080c12" />
            <Stop offset=".02" stopColor="#f1f4f7" />
            <Stop offset=".04" stopColor="#515860" />
            <Stop offset=".08" stopColor="#515860" stopOpacity="0" />
            <Stop offset=".92" stopColor="#eef3f7" stopOpacity="0" />
            <Stop offset=".96" stopColor="#eef3f7" />
            <Stop offset=".98" stopColor="#303740" />
            <Stop offset="1" stopColor="#a6adb4" />
          </LinearGradient>
          <LinearGradient id={`${id}bands`} x1="0" y1=".2" x2="1" y2=".8">
            <Stop offset=".16" stopColor="white" stopOpacity="0" />
            <Stop offset=".17" stopColor="white" stopOpacity=".65" />
            <Stop offset=".20" stopColor="white" stopOpacity="0" />
            <Stop offset=".60" stopColor="white" stopOpacity="0" />
            <Stop offset=".61" stopColor="white" stopOpacity=".31" />
            <Stop offset=".64" stopColor="white" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id={`${id}badge`} x2="1" y2="1">
            <Stop stopColor="#e2e8f0" />
            <Stop offset=".5" stopColor="#64748b" />
            <Stop offset="1" stopColor="#020617" />
          </LinearGradient>
          <LinearGradient id={`${id}tint`} x2="0" y2="1">
            <Stop stopColor={color} stopOpacity=".45" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id={`${id}body`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#8a939c" />
            <Stop offset=".25" stopColor="#30363e" />
            <Stop offset=".42" stopColor="#aab2bc" />
            <Stop offset=".56" stopColor="#444c56" />
            <Stop offset="1" stopColor="#20262f" />
          </LinearGradient>
          <LinearGradient id={`${id}seal`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#e4e8ec" />
            <Stop offset=".18" stopColor="#737b84" />
            <Stop offset=".5" stopColor="#b1b8be" />
            <Stop offset=".8" stopColor="#68717a" />
            <Stop offset="1" stopColor="#e1e7ec" />
          </LinearGradient>
          <LinearGradient id={`${id}shine`}>
            <Stop offset="0" stopColor="white" stopOpacity="0" />
            <Stop offset=".5" stopColor="white" stopOpacity=".38" />
            <Stop offset="1" stopColor="white" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <G mask={reflection ? `url(#${id}reflection)` : undefined}>
          <Rect x="3" y="20" width="244" height="360" fill={`url(#${id}body)`} />
          <Rect x="3" y="20" width="244" height="360" fill={`url(#${id}edge)`} />
          <Rect x="3" y="20" width="244" height="360" fill={`url(#${id}bands)`} />
          <Rect x="3" y="20" width="244" height="360" fill={`url(#${id}tint)`} />
          <Svg
            x="2.5"
            y="20"
            width="245"
            height="360"
            viewBox="0 0 250 400"
            preserveAspectRatio="none"
            style={{ overflow: "hidden" }}
          >
            <G transform="translate(1 2)">
              <Path d={folds} stroke="#000" strokeOpacity=".55" strokeWidth="3" fill="none" />
            </G>
            <Path d={folds} stroke="#fff" strokeOpacity=".65" strokeWidth="1.2" fill="none" />
          </Svg>
          <Rect x="3" y="20" width="244" height="360" fill={`url(#${id}foldLight)`} />
          <Rect x="3" y="268" width="244" height="112" fill="#090e14" opacity=".9" />
          <SvgText
            x="125"
            y="58"
            textAnchor="middle"
            fill="white"
            fontSize="10"
            fontFamily="MPLUSRounded1c_700Bold"
            letterSpacing="2.8"
          >
            WIKI COLLECTION
          </SvgText>
          <Rect x="57" y="69" width="136" height="14" fill="#000" opacity=".8" />
          <SvgText x="125" y="79" textAnchor="middle" fill="white" fontSize="7" letterSpacing="2.1">
            KNOWLEDGE SERIES
          </SvgText>
          <G transform="translate(125 279) rotate(45)">
            <Rect
              x="-35.5"
              y="-35.5"
              width="71"
              height="71"
              rx="10"
              stroke="white"
              fill={`url(#${id}badge)`}
            />
            <G rotation="-45" scale=".8">
              <Path
                d="M0 -14 Q-10 -20 -21 -15 L-21 15 Q-10 10 0 17 Q10 10 21 15 L21 -15 Q10 -20 0 -14 L0 17"
                fill="none"
                stroke="white"
                strokeWidth="1.8"
              />
            </G>
          </G>
          <SvgText
            x="125"
            y="355"
            textAnchor="middle"
            fill="white"
            fontSize="10"
            fontFamily="MPLUSRounded1c_700Bold"
            letterSpacing="2"
          >
            {label ?? "5 CARDS / PACK"}
          </SvgText>
          {[0, 376].map((y) => (
            <G key={y}>
              <Rect y={y} width="250" height="24" rx="2" fill={`url(#${id}seal)`} />
              <Rect
                y={y}
                width="250"
                height="24"
                rx="2"
                fill={`url(#${id}ribs)`}
                stroke="#b6bec6"
                strokeWidth="1"
              />
            </G>
          ))}
        </G>
      </Svg>
    </View>
  );
}
