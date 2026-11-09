import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useId, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from "react-native-reanimated";
import {
  OPENING_CARD_RATIO,
  OpeningCardBack,
  OpeningCardFace,
  openingColors,
  openingFaceRatio,
  openingRarityNames,
  type OpeningCardData,
} from "./opening-card";
import { OpeningRevealLight } from "./opening-lights";
import { wrapperPosition } from "./opening-geometry";

type Props = {
  card: OpeningCardData;
  slot: number;
  count: number;
  time: SharedValue<number>;
  width: number;
  height: number;
  reduced: boolean;
  firstPage: boolean;
  revealed: boolean;
  onPress: () => void;
};

function phase(t: number, from: number, to: number) {
  "worklet";
  const p = Math.max(0, Math.min(1, (t - from) / (to - from)));
  return p * p * (3 - 2 * p);
}

export function CinematicCard({
  card,
  slot,
  count,
  time,
  width,
  height,
  reduced,
  firstPage,
  revealed,
  onPress,
}: Props) {
  const cw = Math.min(width * 0.36, (height * 0.52) / OPENING_CARD_RATIO);
  const ch = cw * OPENING_CARD_RATIO;
  const faceInset = (ch - cw * openingFaceRatio(card.rarity)) / 2;
  const sealY = wrapperPosition(850, width, height).mouth;
  const largeWidth = Math.min(width * 0.78, (height * 0.76) / OPENING_CARD_RATIO);
  const start = slot === 0 ? 2400 : 3400;
  const strong = card.rarity === "legendary" || card.rarity === "double_rare";
  const rainbow = strong || card.rarity === "rare";
  const accent = openingColors[card.rarity] ?? openingColors.common;
  const destinationX = count === 1 ? 0 : (slot === 0 ? -0.22 : 0.22) * width;

  // This is one physical card throughout. The second back starts behind the first.
  const placement = useAnimatedStyle(() => {
    const t = time.get();
    const spread = phase(t, 1350, 1650);
    const lift = phase(t, 850, 1150);
    const risesFromPack = firstPage && slot === 0;
    const startScale = risesFromPack
      ? interpolate(lift, [0, 1], [(0.42 * width) / cw, largeWidth / cw])
      : firstPage
        ? largeWidth / cw
        : 1.14;
    // The reflected foil shudders from side to side as it shrinks into the pair.
    const recoil = firstPage
      ? interpolate(
          t,
          [1145, 1178, 1210, 1242, 1274, 1307, 1340, 1395],
          [0, -0.045, 0.02, -0.08, 0.045, -0.015, 0.075, 0],
          "clamp",
        ) * width
      : 0;
    const shrink = firstPage ? 1 - phase(t, 1145, 1350) * 0.2 : 1;
    const scale = startScale * shrink + (1 - startScale * shrink) * spread;
    const alpha = risesFromPack ? phase(t, 842, 925) : phase(t, 1350, 1480);
    const endY = height * 0.49;
    const startY = sealY + width * 0.42 * OPENING_CARD_RATIO * 0.47;
    const y = risesFromPack ? (startY - endY) * (1 - lift) : 0;
    return {
      opacity: reduced ? (t >= start ? 1 : 0) : alpha,
      transform: [
        { translateX: reduced ? destinationX : destinationX * spread + recoil },
        { translateY: reduced ? 0 : y },
        { scale: reduced ? 1 : scale },
        { rotateZ: `${reduced ? 0 : -2.3 * (1 - lift) * (risesFromPack ? 1 : 0)}deg` },
      ],
    };
  });

  const wipe = useDerivedValue(() => (reduced ? 1 : phase(time.get(), start, start + 240)));
  // One complete pigment cycle per second matches the measured sequence.
  // Freeze its calibrated hue at the first frame of the real face's diagonal reveal.
  const foilPhase = useDerivedValue(() => 0.386 + (Math.min(time.get(), start) - start) / 1000);
  const spin = useDerivedValue(() => {
    const t = time.get();
    // Both hidden faces are foil. Opposite spin and stagger produce different edge-on frames.
    const turns = slot === 0 ? 4 : -4;
    // Let both full-width backs be read together during the first part of the split.
    const from = 1565 + slot * 20;
    const until = slot === 0 ? 2350 : 2530;
    const p = Math.max(0, Math.min(1, (t - from) / (until - from)));
    return turns * 360 * p * (2 - p);
  });
  const rotation = useAnimatedStyle(() => {
    // Each side is foil during the spin. Both cards face forward before their surfaces open.
    const angle = ((((spin.get() + 90) % 180) + 180) % 180) - 90;
    return {
      transform: [{ perspective: 1050 }, { rotateY: `${reduced ? 0 : angle}deg` }],
    };
  });
  const front = useAnimatedStyle(() => ({ opacity: wipe.get() > 0 ? 1 : 0 }));
  const back = useAnimatedStyle(() => ({ opacity: wipe.get() < 1 ? 1 : 0 }));
  const rim = useAnimatedStyle(() => ({ opacity: wipe.get() }));

  const reflectedLight = useAnimatedStyle(() => {
    const t = time.get();
    // Foil reflects the rainbow behind it as its normal turns through the light.
    const incidence = Math.sin((spin.get() * Math.PI) / 360);
    const strength = interpolate(
      t,
      [1380, 1495, 1760, 1920, 2150, 2330],
      [0, 0.77, 0.82, 0.35, 0.16, 0],
      "clamp",
    );
    return {
      opacity: reduced ? 0 : strength * incidence ** 2 * (rainbow ? 0.32 : 1),
      backgroundColor: incidence >= 0 ? "#bd0027" : "#0e349d",
    };
  });
  const glint = useAnimatedStyle(() => {
    const t = time.get();
    const angle = (spin.get() * Math.PI) / 180;
    const hotspot = t < 1350 ? phase(t, 900, 1350) * 1.35 - 0.2 : Math.sin(angle + t * 0.002);
    return {
      opacity: reduced
        ? 0
        : interpolate(t, [880, 1100, 1400, start, start + 250], [0, 0.62, 0.54, 0.45, 0], "clamp"),
      transform: [{ translateX: hotspot * cw * 0.72 }, { rotateZ: "18deg" }],
    };
  });

  const surfaceSweep = useAnimatedStyle(() => {
    const elapsed = time.get() - start;
    return {
      opacity: reduced ? 0 : interpolate(elapsed, [0, 48, 180, 290], [0, 0.9, 0.78, 0], "clamp"),
      transform: [
        { translateX: interpolate(elapsed, [0, 245], [cw * 0.47, -cw * 0.47], "clamp") },
        { translateY: interpolate(elapsed, [0, 245], [ch * 0.49, -ch * 0.49], "clamp") },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents={revealed ? "auto" : "none"}
      accessibilityElementsHidden={!revealed}
      importantForAccessibility={revealed ? "auto" : "no-hide-descendants"}
      style={[
        {
          position: "absolute",
          left: (width - cw) / 2,
          top: height * 0.49 - ch / 2,
          width: cw,
          height: ch,
          // The silver card masks the second foil until their paths separate.
          zIndex: 2 - slot,
        },
        placement,
      ]}
    >
      <OpeningRevealLight
        time={time}
        at={strong ? start + 160 : start - 215}
        width={cw}
        strong={strong}
        reduced={reduced}
      />
      <Animated.View style={[StyleSheet.absoluteFill, rotation]}>
        <Animated.View style={[StyleSheet.absoluteFill, back]}>
          <DiagonalWindow width={cw} height={ch} progress={wipe} remaining>
            <View style={{ width: cw, height: ch }}>
              <OpeningCardBack
                width={cw}
                rainbow={rainbow}
                foilPhase={rainbow && !reduced ? foilPhase : undefined}
              />
              <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { borderRadius: cw * 0.022 }, reflectedLight]}
              />
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { overflow: "hidden", borderRadius: cw * 0.022 }]}
              >
                <Animated.View
                  style={[
                    {
                      position: "absolute",
                      top: -ch * 0.2,
                      left: cw * 0.27,
                      width: cw * 0.34,
                      height: ch * 1.4,
                    },
                    glint,
                  ]}
                >
                  <LinearGradient
                    colors={["transparent", "#f3f5ff44", "#ffffffd0", "#e9efff33", "transparent"]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              </View>
            </View>
          </DiagonalWindow>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              top: faceInset,
              bottom: faceInset,
              borderRadius: cw * 0.022,
              boxShadow: `0 0 ${strong ? 9 : 3}px ${strong ? 2 : 0}px ${accent}`,
            },
            rim,
          ]}
        />
        <Animated.View style={[StyleSheet.absoluteFill, front]}>
          <DiagonalWindow width={cw} height={ch} progress={wipe}>
            <OpeningCardFace card={card} width={cw} />
          </DiagonalWindow>
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { overflow: "hidden", borderRadius: cw * 0.022 }]}
          >
            <Animated.View style={[StyleSheet.absoluteFill, surfaceSweep]}>
              <Svg width="100%" height="100%" viewBox="0 0 100 165">
                <Path
                  d="M-15 145 103 5 29 109Z M20 163 95 45 64 105Z"
                  fill="#abfcff"
                  opacity="0.45"
                />
                <Path
                  d="M8 125 15 111 12 124Z M19 118 30 101 23 117Z M26 112 42 83 34 111Z M46 84 54 70 49 84Z M64 67 78 42 72 65Z M85 41 92 28 90 40Z"
                  fill="#a1efff"
                />
                <Path
                  d="m37 87 1.4 4.2 4.2 1.4-4.2 1.4-1.4 5-1.4-5-4.2-1.4 4.2-1.4Z M61 68l1 4 4 1-4 1-1 5-1-5-4-1 4-1Z"
                  fill="#fff"
                />
              </Svg>
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>
      {!reduced && (
        <TravelingRim
          time={time}
          start={start + 280}
          width={cw}
          height={ch - faceInset * 2}
          inset={faceInset}
          strong={strong}
          revealed={revealed}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${card.title}、${openingRarityNames[card.rarity] ?? card.rarity}、カード詳細`}
        disabled={!revealed}
        onPress={onPress}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

// Complementary diagonal windows replace the foil with the shorter printed face.
// The counter-translation keeps the printed image registered with the foil beneath it.
function DiagonalWindow({
  width,
  height,
  progress,
  remaining = false,
  children,
}: {
  width: number;
  height: number;
  progress: SharedValue<number>;
  remaining?: boolean;
  children: ReactNode;
}) {
  const size = Math.ceil(Math.hypot(width, height)) + 6;
  const extent = (width * Math.cos(Math.PI / 6) + height * Math.sin(Math.PI / 6)) / 2 + 2;
  const direction = remaining ? -1 : 1;
  const angle = remaining ? 210 : 30;
  const edge = useDerivedValue(() => direction * extent * (1 - 2 * progress.get()));
  const window = useAnimatedStyle(() => ({ transform: [{ translateX: edge.get() }] }));
  const fixed = useAnimatedStyle(() => ({ transform: [{ translateX: -edge.get() }] }));
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: "hidden", borderRadius: width * 0.022 }]}>
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          left: (width - size) / 2,
          top: (height - size) / 2,
          transform: [{ rotateZ: `${angle}deg` }],
        }}
      >
        <Animated.View
          style={[
            { position: "absolute", left: size / 2, width: size, height: size, overflow: "hidden" },
            window,
          ]}
        >
          <Animated.View style={[{ left: -size / 2, width: size, height: size }, fixed]}>
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                transform: [{ rotateZ: `${-angle}deg` }],
              }}
            >
              {children}
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

// One soft highlight follows the edge at about half a card width per second.
// Let the same highlight continue past the end of the opening timeline while the player inspects the pair.
function TravelingRim({
  time,
  start,
  width,
  height,
  inset,
  strong,
  revealed,
}: {
  time: SharedValue<number>;
  start: number;
  width: number;
  height: number;
  inset: number;
  strong: boolean;
  revealed: boolean;
}) {
  const following = useSharedValue(0);
  const perimeter = 2 * (width + height);
  const lap = (perimeter / (width * 0.48)) * 1000;
  useEffect(() => {
    following.set(0);
    if (revealed)
      following.set(withRepeat(withTiming(lap, { duration: lap, easing: Easing.linear }), -1));
    return () => cancelAnimation(following);
  }, [revealed, following, lap]);
  const length = width * (strong ? 0.48 : 0.37);
  const color = strong ? "#ff291b" : "#a578ff";
  const haloId = useId().replace(/:/g, "");
  const haloWidth = length * 1.75;
  const haloHeight = width * (strong ? 0.36 : 0.27);
  const position = useDerivedValue(() => {
    const elapsed = Math.min(time.get(), 4300) - start + following.get();
    const distance = ((Math.max(0, elapsed) / lap) * perimeter + width * 0.08) % perimeter;
    const side =
      distance < width ? 0 : distance < width + height ? 1 : distance < width * 2 + height ? 2 : 3;
    const along = distance - [0, width, width + height, 2 * width + height][side]!;
    const edge = side % 2 === 0 ? width : height;
    const x = side === 0 ? along : side === 1 ? width : side === 2 ? width - along : 0;
    const y = side === 0 ? 0 : side === 1 ? along : side === 2 ? height : height - along;
    const corner = Math.max(0, Math.min(along, edge - along));
    const opacity = interpolate(
      elapsed,
      [0, 160, 640],
      [0, strong ? 0.9 : 0.58, strong ? 1 : 0.72],
      "clamp",
    );
    return { x, y, side, corner, opacity };
  });
  const style = useAnimatedStyle(() => {
    const p = position.get();
    return {
      opacity: p.opacity,
      transform: [
        { translateX: p.x },
        { translateY: p.y },
        { rotateZ: `${p.side * 90}deg` },
        { scaleX: Math.min(1, (2 * p.corner + 2) / length) },
      ],
    };
  });
  const halo = useAnimatedStyle(() => {
    const p = position.get();
    return {
      opacity: p.opacity * (1 - Math.min(1, (2 * p.corner) / length)) * 0.85,
      transform: [{ translateX: p.x }, { translateY: p.y }],
    };
  });
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: inset - 1,
            left: -1,
            width: 2,
            height: 2,
            borderRadius: 1,
            backgroundColor: "#fff4f3",
            boxShadow: `0 0 ${width * 0.065}px ${width * 0.018}px ${color}`,
          },
          halo,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          { position: "absolute", left: -length / 2, top: inset - 5, width: length, height: 10 },
          style,
        ]}
      >
        <Svg
          width={haloWidth}
          height={haloHeight}
          style={{
            position: "absolute",
            left: (length - haloWidth) / 2,
            top: 5 - haloHeight / 2,
          }}
        >
          <Defs>
            <RadialGradient id={haloId} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={color} stopOpacity="0.98" />
              <Stop offset="0.3" stopColor={color} stopOpacity="0.87" />
              <Stop offset="0.62" stopColor={color} stopOpacity="0.46" />
              <Stop offset="0.85" stopColor={color} stopOpacity="0.13" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse
            cx={haloWidth / 2}
            cy={haloHeight / 2}
            rx={haloWidth / 2}
            ry={haloHeight / 2}
            fill={`url(#${haloId})`}
          />
        </Svg>
        <LinearGradient
          colors={[`${color}00`, `${color}50`, `${color}8c`, `${color}18`, `${color}00`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: "absolute",
            top: 2,
            width: length,
            height: 6,
            borderRadius: 3,
            boxShadow: `0 0 8px ${color}65`,
          }}
        />
        <LinearGradient
          colors={[`${color}00`, color, "#fff4f4", color, `${color}00`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: "absolute", top: 4, width: length, height: 2, borderRadius: 1 }}
        />
      </Animated.View>
    </>
  );
}
