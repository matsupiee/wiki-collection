import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "@/lib/i18n";
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
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { cardImageDisplayUrl } from "@wiki-collection/db/card-image";
import { apiUrl, useTRPC } from "../../../../lib/client";
import type { Rarity } from "@wiki-collection/db/enums";
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
  selectedWidth,
  seamHeight,
  wrapperPosition,
} from "../../../../components/opening-geometry";
import { OpeningPhoto, stackReadyAt } from "../../../../components/opening-photo";
import { OpeningSeal } from "../../../../components/opening-seal";
import { OpeningInspection } from "../../../../components/opening-inspection";
import {
  OpeningAtmosphere,
  OpeningBeam,
  OpeningRevealGlow,
  SealGlint,
} from "../../../../components/opening-stage";

function playCardFeedback(rarity: Rarity | undefined) {
  if (!rarity || rarity === "common" || rarity === "uncommon") return;
  const feedback =
    rarity === "legendary"
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : Haptics.impactAsync(
          rarity === "rare"
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Heavy,
        );
  void feedback.catch(() => {});
}

export default function Opening() {
  const { openingId, newIds = "" } = useLocalSearchParams<{ openingId: string; newIds?: string }>();
  return <OpeningScene key={openingId} openingId={openingId} newIds={newIds} />;
}
function OpeningScene({ openingId, newIds }: { openingId: string; newIds: string }) {
  const t = useTranslation();
  const playSound = useGameSound();
  const insets = useSafeAreaInsets();
  const trpc = useTRPC();
  const query = useQuery(trpc.opening.get.queryOptions({ openingId }));
  const reveal = useMutation(trpc.opening.reveal.mutationOptions());
  const action = useAction();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [stage, setStage] = useState<"pack" | "selecting" | "tracing" | "running" | "revealed">(
    "pack",
  );
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
  const dragStart = useSharedValue(0);
  const carouselDragged = useSharedValue(false);
  const arrival = useSharedValue(0);
  const cut = useSharedValue(0);
  const committed = useSharedValue(false);
  const shimmer = useSharedValue(0);
  const direction = useSharedValue(1);
  const { width: w, height: h } = size;
  const pw = w * 0.48;
  const ph = pw * OPENING_PACK_RATIO;
  const cards = query.data?.cards ?? [];
  const allTurned = cards.length > 0 && front >= cards.length;
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
    if (focused.current && !leaving.current) playCardFeedback(cards[0]?.card.rarity);
    setStage("revealed");
  }
  function readyToTrace() {
    if (mounted.current) setStage("tracing");
  }
  function selectPack(side = 0) {
    if (leaving.current || busy.current || stage !== "pack" || carouselDragged.get()) return;
    busy.current = true;
    setStage("selecting");
    cancelIntroFrame();
    const pickup = carouselOffset(arrival.get(), side, drag.get() / w) * w;
    cancelAnimation(arrival);
    arrival.set(1380);
    drag.set(reduce ? 0 : pickup);
    drag.set(
      withTiming(0, { duration: reduce ? 0 : 320, easing: Easing.bezier(0.23, 1, 0.32, 1) }),
    );
    time.set(
      withTiming(
        440,
        { duration: reduce ? 0 : 400, easing: Easing.bezier(0.23, 1, 0.32, 1) },
        (done) => {
          if (done) scheduleOnRN(readyToTrace);
        },
      ),
    );
  }
  function play() {
    if (leaving.current || stage !== "tracing" || time.get() >= 565) return;
    committed.set(true);
    cut.set(1);
    playSound("open");
    const end = stackReadyAt;
    const rarity = highestOpeningRarity(cards);
    const impactStyles = {
      rare: Haptics.ImpactFeedbackStyle.Light,
      super_rare: Haptics.ImpactFeedbackStyle.Medium,
      legendary: Haptics.ImpactFeedbackStyle.Heavy,
    };
    const feedback =
      rarity === "common" || rarity === "uncommon"
        ? Haptics.selectionAsync()
        : Haptics.impactAsync(impactStyles[rarity]);
    void feedback.catch(() => {});
    if (reduce) {
      time.set(end);
      revealed();
      return;
    }
    setStage("running");
    time.set(565);
    time.set(
      withTiming(end, { duration: end - 565, easing: Easing.linear }, (finished) => {
        if (finished) scheduleOnRN(revealed);
      }),
    );
  }
  function selectDetail(index: number) {
    playSound("card");
    setDetail(index);
  }
  function finish(skipped = false) {
    if (leaving.current) return;
    leaving.current = true;
    void action
      .run(
        () => reveal.mutateAsync({ openingId }),
        () => {
          if (mounted.current && focused.current) {
            if (skipped) playCardFeedback(highestOpeningRarity(cards));
            router.replace({
              pathname: "/openings/[openingId]/result",
              params: { openingId, newIds },
            });
          }
        },
      )
      .finally(() => {
        leaving.current = false;
        if (mounted.current && stage === "tracing" && time.get() < 565) {
          committed.set(false);
          cut.set(0);
        }
      });
  }
  useEffect(() => {
    if (stage !== "tracing" || reduce) return;
    shimmer.set(0);
    shimmer.set(
      withRepeat(
        withDelay(850, withTiming(1, { duration: 950, easing: Easing.linear })),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(shimmer);
  }, [stage, reduce, shimmer]);
  const sealWidth = w * selectedWidth;
  const tear = Gesture.Pan()
    .enabled(!action.pending && stage === "tracing")
    .activeOffsetX([-6, 6])
    .failOffsetY([-24, 24])
    .maxPointers(1)
    .onUpdate((e) => {
      if (committed.get() || e.numberOfPointers !== 1) return;
      const travel = Math.abs(e.translationX);
      if (travel < Math.abs(e.translationY)) return;
      direction.set(e.translationX >= 0 ? 1 : -1);
      const distance = direction.get() === 1 ? e.x : sealWidth - e.x;
      cut.set(Math.max(0, Math.min(1, distance / sealWidth)));
      if (travel >= 48) {
        committed.set(true);
        scheduleOnRN(play);
      }
    })
    .onFinalize(() => {
      if (!committed.get()) cut.set(withTiming(0, { duration: 160 }));
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
    .enabled(stage === "pack" && !action.pending)
    .activeOffsetX([-8, 8])
    .maxPointers(1)
    .onBegin(() => {
      carouselDragged.set(false);
      cancelAnimation(drag);
      dragStart.set(drag.get());
    })
    .onStart(() => carouselDragged.set(true))
    .onUpdate((e) => {
      if (!committed.get() && !reduce) drag.set(dragStart.get() + e.translationX * 0.55);
    })
    .onEnd((e) => {
      if (committed.get()) return;
      const pitch = w * carouselPitch;
      const snap =
        Math.abs(e.velocityX) > 500
          ? (Math.round(drag.get() / pitch) + Math.sign(e.velocityX)) * pitch
          : Math.round(drag.get() / pitch) * pitch;
      if (snap !== 0) scheduleOnRN(playSound, "scroll");
      if (reduce) {
        drag.set(0);
        return;
      }
      drag.set(
        withSpring(
          snap,
          { duration: 400, dampingRatio: 1, velocity: e.velocityX * 0.3 },
          (done) => {
            if (done) drag.set(0);
          },
        ),
      );
    })
    .onFinalize((_, success) => {
      if (!success && !committed.get()) {
        drag.set(reduce ? 0 : withSpring(0, { duration: 400, dampingRatio: 0.8 }));
      }
    });
  const packStyle = useAnimatedStyle(() => {
    const t = time.get();
    const position = wrapperPosition(t, w, h);
    const x = carouselOffset(reduce ? 1380 : arrival.get(), 0, w ? drag.get() / w : 0) * w;
    const distance = reduce || !w ? 0 : Math.min(1, Math.abs(x) / (w * carouselPitch));
    return {
      opacity: (1 - distance * 0.18) * interpolate(t, [1470, 1540], [1, 0], "clamp"),
      transform: [
        { translateX: x },
        { translateY: position.y },
        { scaleX: 1 - distance * 0.12 },
        {
          scale:
            position.scale * (reduce ? 1 : carouselScale(arrival.get()) * (1 - distance * 0.07)),
        },
      ],
    };
  });
  const seamFade = useAnimatedStyle(() => ({
    opacity: interpolate(time.get(), [620, 675], [1, 0], "clamp"),
  }));
  const guideStyle = useAnimatedStyle(() => ({
    transformOrigin: direction.get() === 1 ? "left" : "right",
    transform: [{ scaleX: cut.get() }],
  }));
  const tipStyle = useAnimatedStyle(() => ({
    opacity:
      cut.get() > 0
        ? 1
        : reduce
          ? 0
          : interpolate(shimmer.get(), [0, 0.08, 0.92, 1], [0, 0.85, 0.85, 0], "clamp"),
    transform: [
      {
        translateX:
          (cut.get() > 0 ? (direction.get() === 1 ? cut.get() : 1 - cut.get()) : shimmer.get()) *
          sealWidth,
      },
    ],
  }));
  return (
    <GestureDetector gesture={carousel}>
      <View style={styles.screen} onLayout={(e) => setSize(e.nativeEvent.layout)}>
        <OpeningAtmosphere width={w} height={h} time={time} reduced={reduce} />
        {query.isPending || motionPreference === null ? (
          <ActivityIndicator color="#355c75" />
        ) : query.error && !query.data ? (
          <View style={{ alignItems: "center", padding: 24 }}>
            <Loading error={query.error} retry={query.refetch} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("backToPacks")}
              style={styles.next}
              onPress={() => router.replace("/packs")}
            >
              <Text style={styles.nextText}>{t("backToPacks")}</Text>
            </Pressable>
          </View>
        ) : (
          w > 0 && (
            <>
              <OpeningRevealGlow time={time} width={w} height={h} reduced={reduce} />
              {(stage === "running" || stage === "revealed") &&
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
                      if (!mounted.current || !focused.current || leaving.current) return;
                      playSound("card");
                      playCardFeedback(cards[front + 1]?.card.rarity);
                      setFront(front + 1);
                      if (front === cards.length - 1) finish();
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
                      onSelect={() => selectPack(side)}
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
                        zIndex: stage === "running" ? 6 : 0,
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
                    <PackReflection slug={query.data!.pack.slug} width={pw} time={time} />
                    <OpeningSeal
                      slug={query.data!.pack.slug}
                      width={pw}
                      time={time}
                      direction={direction}
                      cut={cut}
                      reduced={reduce}
                    />
                    {stage === "pack" && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("choosePack")}
                        onPress={() => selectPack()}
                        onAccessibilityTap={() => {
                          carouselDragged.set(false);
                          selectPack();
                        }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                  </Animated.View>
                  {(stage === "tracing" || stage === "running") && (
                    <View
                      accessible={stage === "tracing"}
                      accessibilityRole="button"
                      accessibilityLabel={t("tearSeal")}
                      accessibilityHint={t("tearHint")}
                      onAccessibilityTap={play}
                      accessibilityActions={[{ name: "activate" }]}
                      onAccessibilityAction={(event) => {
                        if (event.nativeEvent.actionName === "activate") play();
                      }}
                      style={{
                        position: "absolute",
                        left: (w - sealWidth) / 2,
                        top: h * seamHeight - 40,
                        width: sealWidth,
                        height: 80,
                        zIndex: 7,
                        justifyContent: "center",
                      }}
                    >
                      <GestureDetector gesture={tear}>
                        <View
                          collapsable={false}
                          testID="tear-area"
                          style={{ flex: 1, justifyContent: "center" }}
                        >
                          <Animated.View
                            pointerEvents="none"
                            style={[styles.traceOverlay, seamFade]}
                          >
                            <View style={styles.seam} />
                            <Animated.View
                              pointerEvents="none"
                              style={[styles.cutLine, guideStyle]}
                            />
                            <Animated.View pointerEvents="none" style={[styles.tip, tipStyle]}>
                              <SealGlint />
                            </Animated.View>
                          </Animated.View>
                        </View>
                      </GestureDetector>
                    </View>
                  )}
                  <OpeningBeam
                    direction={direction}
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
                  {t("tapPack")}
                </Text>
              )}
              {stage === "revealed" && !allTurned && (
                <View style={[styles.controls, { top: h * 0.81 }]}>
                  <Text style={styles.hintInline}>
                    {front + 1} / {cards.length}　
                    {front + 1 === cards.length ? t("flipForResults") : t("flipHint")}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("photoDetails")}
                    onPress={() => selectDetail(front)}
                    disabled={action.pending}
                    style={styles.next}
                  >
                    <Text style={styles.nextText}>{t("photoDetails")}</Text>
                  </Pressable>
                </View>
              )}
              {allTurned && !action.error && <ActivityIndicator color="#355c75" />}
              {(!allTurned || !!action.error) && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={allTurned ? t("reloadResults") : t("skip")}
                  onPress={() => finish(!allTurned)}
                  disabled={action.pending}
                  style={[styles.skip, { top: insets.top + 8 }]}
                >
                  <Text style={styles.skipText}>{allTurned ? t("reloadResults") : t("skip")}</Text>
                </Pressable>
              )}
              {detail !== null && cards[detail] && (
                <OpeningInspection
                  index={detail}
                  count={front + 1}
                  select={selectDetail}
                  card={cards[detail].card}
                  isNew={newIds.split(",").includes(cards[detail].userCardId)}
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
          <Text accessibilityRole="alert" style={[styles.error, { bottom: insets.bottom + 12 }]}>
            {action.error}
          </Text>
        )}
      </View>
    </GestureDetector>
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
      carouselOffset(reduced ? 1380 : arrival.get(), side, drag.get() / screenWidth) * screenWidth;
    const distance = Math.min(1, Math.abs(offset) / (screenWidth * carouselPitch));
    return {
      zIndex: 1,
      opacity:
        (reduced ? 1 : interpolate(arrival.get(), [120, 250], [0, 1], "clamp")) *
        (1 - distance * 0.18) *
        interpolate(time.get(), [0, 400], [1, 0], "clamp"),
      transform: [
        { translateX: offset },
        { scaleX: 1 - distance * 0.12 },
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
          width,
          height: width * OPENING_PACK_RATIO,
        },
        style,
      ]}
    >
      <Pressable accessible={false} onPress={onSelect}>
        <OpeningPack slug={slug} width={width} />
        <PackReflection slug={slug} width={width} time={time} />
      </Pressable>
    </Animated.View>
  );
}
function PackReflection({
  slug,
  width,
  time,
}: {
  slug: string;
  width: number;
  time: ReturnType<typeof useSharedValue<number>>;
}) {
  const height = width * OPENING_PACK_RATIO;
  const fade = useAnimatedStyle(() => ({
    opacity: 0.22 * interpolate(time.get(), [0, 300], [1, 0], "clamp"),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          position: "absolute",
          top: height + 18,
          width,
          height: height * 0.54,
          overflow: "hidden",
        },
        fade,
      ]}
    >
      <OpeningPack slug={slug} width={width} reflection />
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#dcecf6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  traceOverlay: { width: "100%", justifyContent: "center" },
  seam: { height: 2, backgroundColor: "#d2edff", boxShadow: "0 0 5px 1px #37b5ff" },
  cutLine: {
    position: "absolute",
    width: "100%",
    height: 4,
    backgroundColor: "#fff",
    boxShadow: "0 0 7px 2px #39c6ff",
  },
  tip: {
    position: "absolute",
    left: "-9%",
    width: "18%",
    height: 18,
  },
  hint: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    color: "#425f76",
    fontSize: 11,
  },
  hintInline: { color: "#425f76", fontSize: 11 },
  controls: { position: "absolute", alignItems: "center", width: "100%" },
  next: {
    minHeight: 44,
    minWidth: 120,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#ffffffb0",
    borderRadius: 24,
    backgroundColor: "#ffffff80",
  },
  nextText: { color: "#294b64", fontSize: 12 },
  skip: {
    position: "absolute",
    right: 12,
    top: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: "center",
    zIndex: 10,
  },
  skipText: { color: "#425f76", fontSize: 11 },
  error: { position: "absolute", bottom: 12, color: "#9e2340", padding: 16, zIndex: 30 },
});
