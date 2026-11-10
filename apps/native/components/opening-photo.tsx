import { Pressable } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { CardArt, type CardArtData } from "./ui";

export const stackReadyAt = 2490;

export function OpeningPhoto({
  card,
  depth,
  width,
  height,
  time,
  reduced,
  enabled,
  last,
  onTurn,
}: {
  card: CardArtData & { rarity: string };
  depth: number;
  width: number;
  height: number;
  time: SharedValue<number>;
  reduced: boolean;
  enabled: boolean;
  last: boolean;
  onTurn: () => void;
}) {
  const size = Math.min(width * 0.69, height * 0.45);
  const offset = useSharedValue(0);
  const turning = useSharedValue(false);
  const active = depth === 0 && enabled;
  function turn(direction: number) {
    "worklet";
    if (turning.get()) return;
    turning.set(true);
    offset.set(
      withTiming(
        direction * size,
        {
          duration: reduced ? 0 : 260,
          easing: Easing.bezier(0.23, 1, 0.32, 1),
        },
        (done) => {
          if (done) {
            if (last) {
              offset.set(0);
              turning.set(false);
            }
            scheduleOnRN(onTurn);
          }
        },
      ),
    );
  }
  const pan = Gesture.Pan()
    .enabled(active)
    .activeOffsetX([-8, 8])
    .onUpdate((e) => {
      if (!turning.get()) offset.set(e.translationX);
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > size * 0.24 || Math.abs(e.velocityX) > 650)
        turn(Math.sign(Math.abs(e.velocityX) > 650 ? e.velocityX : e.translationX));
    })
    .onFinalize(() => {
      if (!turning.get()) offset.set(withTiming(0, { duration: reduced ? 0 : 180 }));
    });
  const placement = useAnimatedStyle(() => {
    const p = Math.min(Math.abs(offset.get()) / size, 1);
    const entry = interpolate(time.get(), [1250, 1490], [0, 1], "clamp");
    return {
      opacity: entry * (reduced ? 1 : 1 - p * p),
      transform: [
        { perspective: 900 },
        { translateX: reduced ? 0 : offset.get() * 0.72 },
        { translateY: depth * 4 },
        { rotateZ: `${depth * 2.5}deg` },
        { rotateY: `${reduced ? 0 : -Math.sign(offset.get()) * 83 * p}deg` },
      ],
    };
  });
  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        pointerEvents={active ? "auto" : "none"}
        accessibilityElementsHidden={!active}
        aria-hidden={!active}
        importantForAccessibility={active ? "auto" : "no-hide-descendants"}
        style={{
          position: "absolute",
          top: height * 0.47 - size / 2,
          left: (width - size) / 2,
          width: size,
          zIndex: 5 - depth,
        }}
      >
        <Animated.View style={placement}>
          <Pressable
            disabled={!active}
            accessible={active}
            accessibilityRole="button"
            accessibilityLabel={`${card.title}、${card.rarity.replace("_", " ").toUpperCase()}、${last ? "開封結果を見る" : "めくる"}`}
            onPress={() => turn(-1)}
          >
            <CardArt card={card} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
