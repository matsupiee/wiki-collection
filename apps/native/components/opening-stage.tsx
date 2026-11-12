import { useId } from "react";
import { StyleSheet } from "react-native";
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { selectedWidth, wrapperPosition } from "./opening-geometry";
import { OpeningStars } from "./opening-effects";
type SceneProps = { width: number; height: number; time: SharedValue<number>; reduced: boolean };
export function OpeningAtmosphere({ width, height, time, reduced }: SceneProps) {
  const id = useId().replace(/:/g, "");
  const warm = useAnimatedStyle(() => ({
    opacity: interpolate(time.get(), [0, 350, 600, 850, 1250], [0.5, 0.3, 0.09, 0.4, 0], "clamp"),
    transform: [
      {
        translateY: reduced
          ? 0
          : wrapperPosition(time.get(), width, height).mouth -
            wrapperPosition(0, width, height).mouth,
      },
    ],
  }));
  const dust = useAnimatedStyle(() => ({
    opacity: reduced
      ? 0
      : interpolate(
          time.get(),
          [790, 970, 1170, 1650, 2300, 2900],
          [0, 0.45, 1, 0.95, 0.65, 0],
          "clamp",
        ),
    transform: [{ scale: interpolate(time.get(), [850, 2200], [0.65, 1.32], "clamp") }],
  }));
  return (
    <>
      <OpeningStars reduced={reduced} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, warm]}>
        <Svg width={width} height={height} viewBox="0 0 100 200" preserveAspectRatio="none">
          <Defs>
            <RadialGradient id={id}>
              <Stop offset="0" stopColor="#ff7800" stopOpacity="0.82" />
              <Stop offset="0.46" stopColor="#a32c07" stopOpacity="0.5" />
              <Stop offset="1" stopColor="#2d0014" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50" cy="67" rx="65" ry="29" fill={`url(#${id})`} />
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: width * 1.2,
            height: width * 1.55,
            left: -width * 0.1,
            top: height * 0.49 - width * 0.775,
          },
          dust,
        ]}
      >
        <Animated.Image
          source={require("../assets/opening/prism-dust.png")}
          resizeMode="stretch"
          style={{ width: "100%", height: "100%" }}
        />
      </Animated.View>
    </>
  );
}
export function SealGlint() {
  const id = useId().replace(/:/g, "");
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 32" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id={id}>
          <Stop offset="0" stopColor="white" />
          <Stop offset="0.22" stopColor="#ecffff" />
          <Stop offset="0.52" stopColor="#7feaff" stopOpacity="0.85" />
          <Stop offset="1" stopColor="#37bfff" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="50" cy="16" rx="50" ry="16" fill={`url(#${id})`} />
    </Svg>
  );
}
export function OpeningBeam({
  width,
  height,
  y,
  direction,
  time,
  reduced,
}: {
  width: number;
  height: number;
  y: number;
  direction: SharedValue<number>;
  time: SharedValue<number>;
  reduced: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const style = useAnimatedStyle(() => ({
    zIndex: 7,
    opacity: reduced ? 0 : interpolate(time.get(), [565, 630, 705, 820], [0, 1, 0.96, 0], "clamp"),
  }));
  const hotspot = useAnimatedStyle(() => ({
    zIndex: 7,
    opacity: reduced ? 0 : interpolate(time.get(), [555, 600, 738, 827], [0, 1, 1, 0], "clamp"),
    transform: [{ translateX: width * (0.5 + (direction.get() * selectedWidth) / 2) }],
  }));
  const rim = useAnimatedStyle(() => ({
    zIndex: 7,
    opacity: reduced
      ? 0
      : interpolate(time.get(), [710, 805, 1160, 1410], [0, 1, 0.86, 0], "clamp"),
    transform: [{ translateY: wrapperPosition(time.get(), width, height).mouth - y }],
  }));
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: 0,
            top: y - 24,
            width,
            height: 48,
          },
          style,
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 400 100" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#1366fc" stopOpacity="0" />
              <Stop offset="0.3" stopColor="#1584ff" stopOpacity="0.28" />
              <Stop offset="0.46" stopColor="#59cdff" stopOpacity="0.85" />
              <Stop offset="0.5" stopColor="white" />
              <Stop offset="0.54" stopColor="#8be6ff" stopOpacity="0.88" />
              <Stop offset="0.7" stopColor="#328eff" stopOpacity="0.35" />
              <Stop offset="1" stopColor="#125af0" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="400" height="100" fill={`url(#${id})`} />
          <Path d="M0 50 Q120 46 250 50 T400 48" stroke="white" strokeWidth="2" fill="none" />
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: -width * 0.27,
            top: y - 25,
            width: width * 0.54,
            height: 50,
          },
          hotspot,
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 180 96" preserveAspectRatio="none">
          <Defs>
            <RadialGradient id={`${id}hot`}>
              <Stop offset="0" stopColor="white" />
              <Stop offset="0.17" stopColor="#fff7ff" />
              <Stop offset="0.35" stopColor="#c4fdff" stopOpacity="0.93" />
              <Stop offset="0.56" stopColor="#91dfff" stopOpacity="0.6" />
              <Stop offset="1" stopColor="#388cff" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="90" cy="48" rx="90" ry="48" fill={`url(#${id}hot)`} />
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: (width * (1 - selectedWidth)) / 2,
            top: y - 2,
            width: width * selectedWidth,
            height: 9,
          },
          rim,
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 200 9" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#9caec0" />
              <Stop offset="0.35" stopColor="#edffff" />
              <Stop offset="0.52" stopColor="#acfbff" />
              <Stop offset="1" stopColor="#869baa" />
            </LinearGradient>
          </Defs>
          <Path d="M2 2 Q100 0 198 2 Q100 9 2 2Z" fill="#182132" />
          <Path d="M2 2 Q100 9 198 2" fill="none" stroke={`url(#${id}rim)`} strokeWidth="1.4" />
        </Svg>
      </Animated.View>
    </>
  );
}
export function OpeningRainbow({ width, height, time, reduced }: SceneProps) {
  const id = useId().replace(/:/g, "");
  const style = useAnimatedStyle(() => ({
    opacity: reduced
      ? 0
      : interpolate(time.get(), [1280, 1470, 1730, 2070, 2490], [0, 0.84, 1, 0.82, 0], "clamp"),
    transform: [
      {
        translateY: interpolate(time.get(), [1280, 2490], [height * 0.15, -height * 0.18], "clamp"),
      },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={width} height={height} viewBox="0 0 300 600" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={`${id}wash`}>
            <Stop offset="0" stopColor="#ac36bb" stopOpacity="0.8" />
            <Stop offset="0.48" stopColor="#501777" stopOpacity="0.7" />
            <Stop offset="1" stopColor="#0b103d" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={`${id}cloud`}>
            <Stop offset="0" stopColor="#00bf9d" stopOpacity="0.64" />
            <Stop offset="0.65" stopColor="#3045d9" stopOpacity="0.5" />
            <Stop offset="1" stopColor="#3045d9" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient
            id={`${id}arc`}
            gradientUnits="userSpaceOnUse"
            cx="340"
            cy="610"
            rx="510"
            ry="465"
            fx="340"
            fy="610"
          >
            <Stop offset="0.59" stopColor="#513ce6" stopOpacity="0" />
            <Stop offset="0.66" stopColor="#4024d3" stopOpacity="0.8" />
            <Stop offset="0.70" stopColor="#176aee" />
            <Stop offset="0.74" stopColor="#29d7cc" />
            <Stop offset="0.78" stopColor="#9bf623" />
            <Stop offset="0.81" stopColor="#ffe632" />
            <Stop offset="0.85" stopColor="#f88839" />
            <Stop offset="0.88" stopColor="#f555b8" stopOpacity="0.8" />
            <Stop offset="0.96" stopColor="#de35b8" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="233" cy="277" rx="240" ry="213" fill={`url(#${id}wash)`} />
        <Ellipse cx="18" cy="338" rx="192" ry="201" fill={`url(#${id}cloud)`} />
        <Rect width="300" height="600" fill={`url(#${id}arc)`} />
      </Svg>
    </Animated.View>
  );
}
