import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
// CSS radial-gradient(circle ...) sizes use the farthest corner as 100%.
export function AppBackground() {
  const { width, height } = useWindowDimensions();
  const radius = (x: number, y: number, stop: number) =>
    Math.max(
      Math.hypot(x, y),
      Math.hypot(width - x, y),
      Math.hypot(x, height - y),
      Math.hypot(width - x, height - y),
    ) * stop;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Defs>
          {[
            { id: "violet", x: 0.5, y: 1, stop: 0.5, color: "#ddd6fe" },
            { id: "sky", x: 0.85, y: 0.2, stop: 0.4, color: "#bae6fd" },
            { id: "pink", x: 0.15, y: 0.1, stop: 0.35, color: "#fbcfe8" },
          ].map((g) => (
            <RadialGradient
              key={g.id}
              id={g.id}
              gradientUnits="userSpaceOnUse"
              cx={width * g.x}
              cy={height * g.y}
              r={radius(width * g.x, height * g.y, g.stop)}
            >
              <Stop offset="0" stopColor={g.color} />
              <Stop offset="1" stopColor={g.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        <Rect width={width} height={height} fill="#f8fafc" />
        {["violet", "sky", "pink"].map((id) => (
          <Rect key={id} width={width} height={height} fill={`url(#${id})`} />
        ))}
      </Svg>
    </View>
  );
}
