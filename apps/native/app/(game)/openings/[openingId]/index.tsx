import { useGameSound } from "@/lib/game-sounds";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { cardImageDisplayUrl } from "@wiki-collection/db/card-image";
import { apiUrl, useTRPC } from "../../../../lib/client";
import { highestOpeningRarity } from "../../../../lib/rarity";
import { useAction } from "../../../../lib/mutation";
import { Loading } from "../../../../components/ui";
import { Text } from "../../../../components/typography";
import { OPENING_PACK_RATIO, OpeningPack } from "../../../../components/opening-pack";
import {
  carouselPitch,
  carouselOffset,
  carouselScale,
  restingPackCenter,
  sealFraction,
  wrapperPosition,
} from "../../../../components/opening-geometry";
import { OpeningPhoto, stackReadyAt } from "../../../../components/opening-photo";
import { OpeningInspection } from "../../../../components/opening-inspection";
import {
  OpeningAtmosphere,
  OpeningBeam,
  OpeningRainbow,
} from "../../../../components/opening-stage";

export default function Opening() {
  const { openingId } = useLocalSearchParams<{ openingId: string }>();
  return <OpeningScene key={openingId} openingId={openingId} />;
}
function OpeningScene({ openingId }: { openingId: string }) {
  const playSound = useGameSound();
  const trpc = useTRPC();
  const query = useQuery(trpc.opening.get.queryOptions({ openingId }));
  const reveal = useMutation(trpc.opening.reveal.mutationOptions());
  const action = useAction();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [stage, setStage] = useState<"pack" | "running" | "revealed">("pack");
  const [front, setFront] = useState(0);
  const [detail, setDetail] = useState<number | null>(null);
  const [motionPreference, setMotionPreference] = useState<boolean | null>(null);
  const reduce = motionPreference !== false;
  const [packLaidOut, setPackLaidOut] = useState(false);
  const introFrame = useRef<number | null>(null);
  const cancelIntroFrame = useCallback(() => {
    if (introFrame.current !== null) cancelAnimationFrame(introFrame.current);
    introFrame.current = null;
  }, []);
  const mounted = useRef(true);
  const busy = useRef(false);
  const leaving = useRef(false);
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      return () => {
        focused.current = false;
      };
    }, []),
  );
  const time = useSharedValue(-1);
  const drag = useSharedValue(0);
  const arrival = useSharedValue(0);
  const cut = useSharedValue(0);
  const committed = useSharedValue(false);
  const validStart = useSharedValue(false);
  const { width: w, height: h } = size;
  const pw = w * 0.48;
  const ph = pw * OPENING_PACK_RATIO;
  const cards = query.data?.cards ?? [];
  useEffect(() => {
    mounted.current = true;
    let active = true;
    let preferenceChanged = false;
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
      preferenceChanged = true;
      if (active) setMotionPreference(enabled);
    });
    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => true)
      .then((enabled) => {
        if (active && !preferenceChanged) setMotionPreference(enabled);
      });
    return () => {
      active = false;
      mounted.current = false;
      cancelIntroFrame();
      sub.remove();
      cancelAnimation(time);
      cancelAnimation(arrival);
      cancelAnimation(drag);
      cancelAnimation(cut);
    };
  }, []);
  useEffect(() => {
    for (const c of query.data?.cards ?? []) {
      if (c.card.imageUrl)
        void Image.prefetch(new URL(cardImageDisplayUrl(c.card.imageUrl), apiUrl).href).catch(
          () => {},
        );
    }
  }, [query.data?.opening.id]);
  function revealed() {
    if (!mounted.current) return;
    busy.current = false;
    setStage("revealed");
  }
  function play(side = 0) {
    if (leaving.current) {
      if (!busy.current && stage === "pack") {
        committed.set(false);
        cut.set(0);
      }
      return;
    }
    if (busy.current || !query.data) return;
    busy.current = true;
    playSound("open");
    cancelIntroFrame();
    const pickup =
      drag.get() + (reduce ? side * carouselPitch : carouselOffset(arrival.get(), side)) * w;
    cancelAnimation(arrival);
    arrival.set(1380);
    drag.set(reduce ? 0 : pickup);
    drag.set(
      withTiming(0, { duration: reduce ? 0 : 320, easing: Easing.bezier(0.23, 1, 0.32, 1) }),
    );
    committed.set(true);
    const end = stackReadyAt;
    const rarity = highestOpeningRarity(cards);
    const impactStyles = {
      rare: Haptics.ImpactFeedbackStyle.Light,
      super_rare: Haptics.ImpactFeedbackStyle.Medium,
      legendary: Haptics.ImpactFeedbackStyle.Heavy,
    };
    const feedback =
      rarity === "common" ? Haptics.selectionAsync() : Haptics.impactAsync(impactStyles[rarity]);
    void feedback.catch(() => {});
    if (reduce) {
      time.set(end);
      revealed();
      return;
    }
    setStage("running");
    time.set(0);
    time.set(
      withTiming(end, { duration: end, easing: Easing.linear }, (finished) => {
        if (finished) scheduleOnRN(revealed);
      }),
    );
  }
  function selectDetail(index: number) {
    playSound("card");
    setDetail(index);
  }
  function finish() {
    if (leaving.current) return;
    leaving.current = true;
    void action
      .run(
        () => reveal.mutateAsync({ openingId }),
        () => {
          if (mounted.current && focused.current) router.replace(`/openings/${openingId}/result`);
        },
      )
      .finally(() => {
        leaving.current = false;
        if (mounted.current && stage === "pack" && !busy.current) {
          committed.set(false);
          cut.set(0);
        }
      });
  }
  const tear = Gesture.Pan()
    .enabled(!action.pending)
    .minDistance(0)
    .onBegin((e) => {
      validStart.set(e.x < pw * 0.35 && !committed.get());
    })
    .onUpdate((e) => {
      if (!validStart.get() || committed.get()) return;
      const p = Math.max(0, Math.min(1, e.translationX / (pw * 0.7)));
      cut.set(p);
      if (p >= 0.95) {
        committed.set(true);
        scheduleOnRN(play, 0);
      }
    })
    .onFinalize(() => {
      if (!committed.get()) cut.set(withSpring(0, { duration: 400, dampingRatio: 1 }));
      validStart.set(false);
    });
  useEffect(() => {
    if (!packLaidOut || reduce || committed.get()) return;
    arrival.set(0);
    // Let the first small foil wrapper paint before its approach clock starts.
    introFrame.current = requestAnimationFrame(() => {
      introFrame.current = requestAnimationFrame(() => {
        introFrame.current = null;
        if (mounted.current && !committed.get()) {
          arrival.set(withDelay(80, withTiming(1380, { duration: 1380, easing: Easing.linear })));
        }
      });
    });
    return () => {
      cancelIntroFrame();
      cancelAnimation(arrival);
    };
  }, [packLaidOut, reduce, arrival, committed, cancelIntroFrame]);
  const carousel = Gesture.Pan()
    .onUpdate((e) => {
      if (!committed.get()) drag.set(e.translationX * 0.55);
    })
    .onEnd((e) => {
      if (committed.get()) return;
      const pitch = w * carouselPitch;
      const snap =
        Math.abs(e.translationX) > pitch * 0.4 || Math.abs(e.velocityX) > 500
          ? Math.sign(e.translationX) * pitch
          : 0;
      if (snap !== 0) scheduleOnRN(playSound, "scroll");
      drag.set(
        withSpring(
          snap,
          { duration: 400, dampingRatio: 1, velocity: e.velocityX * 0.3 },
          (done) => {
            if (done) drag.set(0);
          },
        ),
      );
    });
  const packStyle = useAnimatedStyle(() => {
    const t = time.get();
    const position = wrapperPosition(t, w, h);
    const x = drag.get() + (reduce ? 0 : carouselOffset(arrival.get()) * w);
    const distance = reduce || !w ? 0 : Math.min(1, Math.abs(x) / (w * carouselPitch));
    return {
      opacity: (1 - distance * 0.5) * interpolate(t, [1180, 1250], [1, 0], "clamp"),
      transform: [
        { translateX: x },
        { translateY: reduce ? 0 : position.y },
        { perspective: 800 },
        { rotateY: `${-Math.sign(x) * distance * 20}deg` },
        {
          scale: reduce ? 1 : position.scale * carouselScale(arrival.get()) * (1 - distance * 0.07),
        },
      ],
    };
  });
  const sealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(time.get(), [620, 790], [1, 0], "clamp"),
    transform: [
      { translateY: reduce ? 0 : interpolate(time.get(), [650, 850], [0, -12], "clamp") },
    ],
  }));
  const guideStyle = useAnimatedStyle(() => ({
    opacity: cut.get(),
    transform: [{ scaleX: cut.get() }],
  }));
  return (
    <View style={styles.screen} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      <OpeningAtmosphere width={w} height={h} time={time} reduced={reduce} />
      {query.isPending || motionPreference === null ? (
        <ActivityIndicator color="#ffffff" />
      ) : query.error && !query.data ? (
        <View style={{ alignItems: "center", padding: 24 }}>
          <Loading error={query.error} retry={query.refetch} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="パック一覧に戻る"
            style={styles.next}
            onPress={() => router.replace("/packs")}
          >
            <Text style={styles.nextText}>パック一覧に戻る</Text>
          </Pressable>
        </View>
      ) : (
        w > 0 && (
          <>
            <OpeningRainbow time={time} width={w} height={h} reduced={reduce} />
            {stage !== "pack" &&
              cards.slice(front).map((c, depth) => (
                <OpeningPhoto
                  key={c.userCardId}
                  card={c.card}
                  depth={depth}
                  width={w}
                  height={h}
                  time={time}
                  reduced={reduce}
                  enabled={stage === "revealed" && detail === null && !action.pending}
                  last={front + depth === cards.length - 1}
                  onTurn={() => {
                    if (!mounted.current) return;
                    playSound("card");
                    if (front === cards.length - 1) finish();
                    else setFront(front + 1);
                  }}
                />
              ))}
            {stage !== "revealed" && (
              <>
                {[-2, -1, 1, 2].map((side) => (
                  <PackNeighbor
                    key={side}
                    side={side}
                    slug={query.data!.pack.slug}
                    width={pw}
                    height={h}
                    screenWidth={w}
                    time={time}
                    drag={drag}
                    arrival={arrival}
                    onSelect={() => play(side)}
                    reduced={reduce}
                  />
                ))}
                <Animated.View
                  onLayout={() => setPackLaidOut(true)}
                  style={[
                    {
                      position: "absolute",
                      left: (w - pw) / 2,
                      top: h * restingPackCenter - ph / 2,
                      width: pw,
                      height: ph,
                    },
                    packStyle,
                  ]}
                >
                  <View
                    style={{
                      position: "absolute",
                      top: ph * sealFraction,
                      width: pw,
                      height: ph * (1 - sealFraction),
                      overflow: "hidden",
                    }}
                  >
                    <View style={{ marginTop: -ph * sealFraction }}>
                      <OpeningPack slug={query.data!.pack.slug} width={pw} />
                    </View>
                  </View>
                  <Animated.View
                    style={[{ height: ph * sealFraction, overflow: "hidden" }, sealStyle]}
                  >
                    <OpeningPack slug={query.data!.pack.slug} width={pw} />
                  </Animated.View>
                  {stage === "pack" && (
                    <>
                      <GestureDetector gesture={carousel}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="タップで開ける"
                          onPress={() => play()}
                          style={{ position: "absolute", top: 45, bottom: 0, width: pw }}
                        />
                      </GestureDetector>
                      <GestureDetector gesture={tear}>
                        <View
                          collapsable={false}
                          testID="tear-area"
                          style={{ position: "absolute", top: -12, height: 52, width: pw }}
                        >
                          <Animated.View
                            style={[
                              {
                                top: ph * sealFraction + 12,
                                height: 2,
                                backgroundColor: "#c5f5ff",
                                transformOrigin: "left",
                                boxShadow: "0 0 12px #70cfff",
                              },
                              guideStyle,
                            ]}
                          />
                        </View>
                      </GestureDetector>
                    </>
                  )}
                </Animated.View>
                <OpeningBeam
                  time={time}
                  width={w}
                  height={h}
                  y={wrapperPosition(650, w, h).mouth}
                  reduced={reduce}
                />
              </>
            )}
            {stage === "pack" && (
              <Text style={[styles.hint, { top: h * 0.86 }]} pointerEvents="none">
                パックをタップして開封
              </Text>
            )}
            {stage === "revealed" && (
              <View style={[styles.controls, { top: h * 0.81 }]}>
                <Text style={styles.hintInline}>
                  {front + 1} / {cards.length}　
                  {front + 1 === cards.length
                    ? "めくって結果を見る"
                    : "タップまたはスワイプでめくる"}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="写真の詳細を見る"
                  onPress={() => selectDetail(front)}
                  disabled={action.pending}
                  style={styles.next}
                >
                  <Text style={styles.nextText}>写真の詳細を見る</Text>
                </Pressable>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="スキップ"
              onPress={finish}
              disabled={action.pending}
              style={styles.skip}
            >
              <Text style={styles.skipText}>スキップ</Text>
            </Pressable>
            {detail !== null && cards[detail] && (
              <OpeningInspection
                index={detail}
                count={front + 1}
                select={selectDetail}
                card={cards[detail].card}
                isNew={cards[detail].isNew}
                width={w}
                height={h}
                reduced={reduce}
                close={() => setDetail(null)}
              />
            )}
          </>
        )
      )}
      {!!action.error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {action.error}
        </Text>
      )}
    </View>
  );
}
function PackNeighbor({
  slug,
  side,
  width,
  height,
  screenWidth,
  time,
  drag,
  arrival,
  onSelect,
  reduced,
}: {
  slug: string;
  side: number;
  width: number;
  height: number;
  screenWidth: number;
  time: ReturnType<typeof useSharedValue<number>>;
  drag: ReturnType<typeof useSharedValue<number>>;
  arrival: ReturnType<typeof useSharedValue<number>>;
  onSelect: () => void;
  reduced: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const offset =
      (reduced ? side * carouselPitch : carouselOffset(arrival.get(), side)) * screenWidth +
      drag.get();
    const distance = Math.min(1, Math.abs(offset) / (screenWidth * carouselPitch));
    return {
      opacity:
        (reduced ? 1 : interpolate(arrival.get(), [120, 250], [0, 1], "clamp")) *
        (1 - distance * 0.5) *
        interpolate(time.get(), [0, 400], [1, 0], "clamp"),
      transform: [
        { translateX: offset },
        { perspective: 800 },
        { rotateY: `${reduced ? 0 : -Math.sign(offset) * distance * 20}deg` },
        { scale: (1 - distance * 0.07) * (reduced ? 1 : carouselScale(arrival.get())) },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: (screenWidth - width) / 2,
          top: height * restingPackCenter - (width * OPENING_PACK_RATIO) / 2,
        },
        style,
      ]}
    >
      <Pressable accessible={false} onPress={onSelect}>
        <OpeningPack slug={slug} width={width} />
      </Pressable>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  hint: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    color: "#8b8c92",
    fontSize: 11,
  },
  hintInline: { color: "#85878e", fontSize: 11 },
  controls: { position: "absolute", alignItems: "center", width: "100%" },
  next: {
    minHeight: 44,
    minWidth: 120,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#ffffff35",
    borderRadius: 24,
    backgroundColor: "#ffffff0b",
  },
  nextText: { color: "#eeeef1", fontSize: 12 },
  skip: {
    position: "absolute",
    right: 12,
    top: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: "center",
    zIndex: 10,
  },
  skipText: { color: "#777a82", fontSize: 11 },
  error: { position: "absolute", bottom: 12, color: "#fda4af", padding: 16, zIndex: 30 },
});
