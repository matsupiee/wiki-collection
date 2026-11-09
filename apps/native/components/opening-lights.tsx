import { useId } from "react";
import { StyleSheet } from "react-native";
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";

type LightProps = {
  time: SharedValue<number>;
  at: number;
  width: number;
  strong: boolean;
  reduced: boolean;
};
export function OpeningRevealLight({ time, at, width, strong, reduced }: LightProps) {
  const id = useId().replace(/:/g, "");
  const style = useAnimatedStyle(() => {
    const t = time.get() - at;
    return {
      opacity: reduced ? 0 : interpolate(t, [-140, 20, 200, 700], [0, 1, 0.95, 0], "clamp"),
      transform: [
        { scale: interpolate(t, [-140, 100, 700], [0.65, 1.07, 1.15], "clamp") },
        { rotate: `${strong ? interpolate(t, [-140, 700], [-8, 10], "clamp") : 0}deg` },
      ],
    };
  });
  const fireStyle = useAnimatedStyle(() => {
    const frame = Math.max(0, Math.min(23, Math.floor((time.get() - at + 85) / 38)));
    const size = width * 3.03;
    return {
      transform: [
        { translateX: -(frame % 6) * size },
        { translateY: -Math.floor(frame / 6) * size },
      ],
    };
  });
  const afterglow = useAnimatedStyle(() => ({
    opacity: reduced
      ? 0
      : interpolate(time.get() - at, [-85, 30, 240, 680, 1170], [0, 1, 1, 0.67, 0], "clamp"),
    transform: [
      { scale: interpolate(time.get() - at, [-85, 180, 900], [0.78, 1.04, 1.11], "clamp") },
    ],
  }));
  const size = width * (strong ? 3.03 : 2.36);
  if (strong)
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: size,
            height: size,
            left: (width - size) / 2,
            top: (width * 1.65 - size) / 2,
            overflow: "hidden",
          },
          afterglow,
        ]}
      >
        <Animated.Image
          resizeMode="stretch"
          source={require("../assets/opening/flare.png")}
          style={[
            { width: size * 6, height: size * 4, position: "absolute", left: 0, top: 0 },
            fireStyle,
          ]}
        />
      </Animated.View>
    );
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          left: (width - size) / 2,
          top: (width * 1.65 - size) / 2,
        },
        style,
      ]}
    >
      <Svg style={StyleSheet.absoluteFill} width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id={`${id}halo`} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0.25" stopColor={strong ? "#ffe71b" : "#fff"} stopOpacity="0.9" />
            <Stop offset="0.63" stopColor={strong ? "#ff6900" : "#72ceff"} stopOpacity="0.8" />
            <Stop offset="0.76" stopColor={strong ? "#ff1600" : "#cedfff"} stopOpacity="0.55" />
            <Stop offset="1" stopColor={strong ? "#e31600" : "#94b6ff"} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="100" cy="100" r="99" fill={`url(#${id}halo)`} />
        <Path
          d="M100 0 107 80 117 93 193 100 117 104 105 119 100 200 95 119 84 106 5 100 84 93 96 80Z"
          fill="#eefaff"
        />
        {Array.from({ length: strong ? 32 : 24 }, (_, i) => {
          const angle = i * 2.39996;
          const r = 63 + ((i * 29) % 34);
          return (
            <Rect
              key={i}
              x={100 + Math.cos(angle) * r}
              y={100 + Math.sin(angle) * r}
              width={i % 4 === 0 ? 1.7 : 0.8}
              height={i % 4 === 0 ? 3 : 1.2}
              fill={strong ? (i % 3 ? "#ff8d15" : "#ffe065") : "#adfaff"}
            />
          );
        })}
      </Svg>
    </Animated.View>
  );
}
