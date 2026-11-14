import { useId } from "react";
import { LinearGradient as BackgroundGradient } from "expo-linear-gradient";
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
  const revealedSky = useAnimatedStyle(() => ({
    opacity: interpolate(time.get(), [1050, 1750], [0, 1], "clamp"),
  }));
  return (
    <>
      <BackgroundGradient
        pointerEvents="none"
        colors={["#c8def1", "#eefaff", "#ffffff", "#cdeaf2"]}
        locations={[0, 0.43, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, revealedSky]}>
        <BackgroundGradient
          colors={["#dce6fb", "#b7cfea", "#7fabc9"]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Svg
        pointerEvents="none"
        width={width}
        height={height}
        style={StyleSheet.absoluteFill}
        viewBox="0 0 100 200"
        preserveAspectRatio="none"
      >
        <Defs>
          <RadialGradient id={id}>
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0.7" />
            <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50" cy="85" rx="65" ry="70" fill={`url(#${id})`} />
      </Svg>
      <OpeningStars reduced={reduced} />
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
// A soft light behind the emerging cards, never a full-screen flash.
export function OpeningRevealGlow({ width, height, time, reduced }: SceneProps) {
  const id = useId().replace(/:/g, "");
  const style = useAnimatedStyle(() => ({
    opacity: reduced
      ? 0
      : interpolate(time.get(), [1100, 1450, 1850, 2200], [0, 0.65, 0.35, 0], "clamp"),
  }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={width} height={height} viewBox="0 0 100 200" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={id}>
            <Stop offset="0" stopColor="white" />
            <Stop offset="0.5" stopColor="#d0ffff" stopOpacity="0.5" />
            <Stop offset="1" stopColor="#d0ffff" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50" cy="100" rx="65" ry="55" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}
