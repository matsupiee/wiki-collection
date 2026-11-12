import Animated, { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { OpeningPack, OPENING_PACK_RATIO } from "./opening-pack";
import { sealFraction } from "./opening-geometry";

type SealProps = {
  slug: string;
  width: number;
  cut: SharedValue<number>;
  direction: SharedValue<number>;
  time: SharedValue<number>;
  reduced: boolean;
};

export function OpeningSeal(props: SealProps) {
  return (
    <>
      <FoilSection {...props} loose={false} />
      <FoilSection {...props} loose />
    </>
  );
}

// Both windows show the original wrapper art. Only the section behind the finger
// lifts, hinging at the moving cut point until the entire strip comes free.
function FoilSection({
  slug,
  width,
  cut,
  direction,
  time,
  reduced,
  loose,
}: SealProps & { loose: boolean }) {
  const packHeight = width * OPENING_PACK_RATIO;
  const windowStyle = useAnimatedStyle(() => {
    const p = cut.get();
    const side = direction.get();
    const length = (loose ? p : 1 - p) * width;
    const fromLeft = (side === 1) === loose;
    const fly = loose ? interpolate(time.get(), [625, 1265], [0, 1], "clamp") : 0;
    return {
      left: fromLeft ? 0 : width - length,
      width: length,
      opacity: length === 0 ? 0 : interpolate(fly, [0.78, 1], [1, 0], "clamp"),
      transformOrigin: side === 1 ? "right bottom" : "left bottom",
      transform: [
        { translateX: side * fly * width * 0.9 },
        { translateY: -fly * packHeight * 0.45 },
        { rotateZ: `${loose && !reduced ? side * (p * 4 + fly * 23) : 0}deg` },
        { rotateX: `${-fly * 75}deg` },
      ],
    };
  });
  const artStyle = useAnimatedStyle(() => {
    const fromLeft = (direction.get() === 1) === loose;
    return {
      transform: [{ translateX: fromLeft ? 0 : -width * (loose ? 1 - cut.get() : cut.get()) }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", height: packHeight * sealFraction, overflow: "hidden" },
        windowStyle,
      ]}
    >
      <Animated.View style={[{ width }, artStyle]}>
        <OpeningPack slug={slug} width={width} />
      </Animated.View>
    </Animated.View>
  );
}
