import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

// Low-frequency drift: one shared UI clock, no per-frame React state.
export function OpeningStars({ reduced }: { reduced: boolean }) {
  const clock = useSharedValue(0);
  useEffect(() => {
    clock.set(0);
    if (!reduced)
      clock.set(withRepeat(withTiming(1, { duration: 6500, easing: Easing.linear }), -1));
    return () => cancelAnimation(clock);
  }, [reduced, clock]);
  return (
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      {Array.from({ length: 22 }, (_, i) => (
        <Star key={i} index={i} clock={clock} reduced={reduced} />
      ))}
    </View>
  );
}
function Star({
  index,
  clock,
  reduced,
}: {
  index: number;
  clock: SharedValue<number>;
  reduced: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const phase = (clock.get() + index * 0.137) % 1;
    return {
      opacity: reduced ? 0.15 : Math.sin(phase * Math.PI) * (index % 5 === 0 ? 0.65 : 0.3),
      transform: [{ translateY: reduced ? 0 : -phase * 48 }, { rotate: "45deg" }],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: `${(index * 61.8) % 100}%`,
          top: `${10 + ((index * 37.7) % 85)}%`,
          width: index % 5 === 0 ? 3 : 1.5,
          height: index % 5 === 0 ? 3 : 1.5,
          backgroundColor: index % 4 === 0 ? "#ffffff" : "#e8ffff",
          boxShadow: index % 5 === 0 ? "0 0 7px 1px #e8f3ff66" : undefined,
        },
        style,
      ]}
    />
  );
}
