import { Text } from "../../../../components/typography";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  View,
  Vibration,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cardImageDisplayUrl } from "@wiki-collection/db/card-image";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiUrl, useTRPC } from "../../../../lib/client";
import { useAction } from "../../../../lib/mutation";
import { Card, Loading, marks } from "../../../../components/ui";
import { AppBackground } from "../../../../components/app-background";
import { Pack } from "../../../../components/pack";
const colors: Record<string, readonly [string, string, string]> = {
  common: ["#a5b4fc", "#ddd6fe", "#e0f2fe"],
  uncommon: ["#a5b4fc", "#ddd6fe", "#ccfbf1"],
  rare: ["#a78bfa", "#f5d0fe", "#e0f2fe"],
  double_rare: ["#fbcfe8", "#c4b5fd", "#a5f3fc"],
  legendary: ["#fcd34d", "#fef9c3", "#fed7aa"],
};
export default function Opening() {
  const { openingId } = useLocalSearchParams<{ openingId: string }>();
  const { height } = useWindowDimensions();
  const trpc = useTRPC();
  const query = useQuery(trpc.opening.get.queryOptions({ openingId }));
  const reveal = useMutation(trpc.opening.reveal.mutationOptions());
  const action = useAction();
  const [stage, setStage] = useState<"loading" | "pack" | "torn" | "cards">("loading");
  const [index, setIndex] = useState(0);
  const [tear, setTear] = useState(0);
  const [reduce, setReduce] = useState(false);
  const [flash, setFlash] = useState(false);
  const tearing = useRef(false);
  const area = useRef<View>(null);
  const left = useRef(0);
  const tearProgress = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enter = useRef(new Animated.Value(0)).current;
  const torn = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.5)).current;
  const exiting = useRef(false);
  const exit = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!query.data) return;
    let active = true;
    Promise.all([
      new Promise((r) => setTimeout(r, 600)),
      ...query.data.cards.map((c) =>
        c.card.imageUrl
          ? Image.prefetch(new URL(cardImageDisplayUrl(c.card.imageUrl), apiUrl).href).catch(
              () => false,
            )
          : Promise.resolve(),
      ),
    ]).then(() => {
      if (active) setStage("pack");
    });
    return () => {
      active = false;
    };
  }, [query.data?.opening.id]);
  useEffect(() => {
    if (stage !== "pack") return;
    Animated.timing(enter, {
      toValue: 1,
      duration: reduce ? 0 : 600,
      useNativeDriver: Platform.OS !== "web",
    }).start();
    if (reduce) return;
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [stage, reduce]);
  const current = query.data?.cards[index];
  useEffect(() => {
    if (stage !== "cards") return;
    cardAnim.setValue(0);
    exit.setValue(0);
    exiting.current = false;
    Animated.spring(cardAnim, {
      toValue: 1,
      stiffness: current?.card.rarity === "legendary" ? 80 : 220,
      damping: current?.card.rarity === "legendary" ? 14 : 22,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [stage, index]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const finish = () =>
    void action.run(
      () => reveal.mutateAsync({ openingId }),
      () => router.replace(`/openings/${openingId}/result`),
    );
  const tearOpen = () => {
    if (stage !== "pack") return;
    tearing.current = false;
    setTear(1);
    setStage("torn");
    setFlash(true);
    Vibration.vibrate(40);
    Animated.timing(torn, {
      toValue: 1,
      duration: reduce ? 0 : 700,
      useNativeDriver: Platform.OS !== "web",
    }).start();
    timer.current = setTimeout(
      () => {
        setFlash(false);
        setStage("cards");
      },
      reduce ? 200 : 900,
    );
  };
  const advance = () => {
    if (stage !== "cards" || exiting.current || action.pending) return;
    if (index >= (query.data?.cards.length ?? 0) - 1) {
      finish();
      return;
    }
    exiting.current = true;
    Animated.timing(exit, {
      toValue: 1,
      duration: reduce ? 0 : 350,
      useNativeDriver: Platform.OS !== "web",
    }).start(() => setIndex((i) => i + 1));
  };
  const move = (pageX: number) => {
    if (!tearing.current || stage !== "pack") return;
    const t = Math.min(1, Math.max(0, (pageX - left.current) / 256));
    tearProgress.current = Math.max(tearProgress.current, t);
    setTear(tearProgress.current);
    if (t >= 0.9) tearOpen();
  };
  return (
    <View style={{ flex: 1 }}>
      <AppBackground />
      <LinearGradient
        colors={
          stage === "loading"
            ? ["white", "white"]
            : stage === "cards" && current
              ? (colors[current.card.rarity] ?? colors.common!)
              : ["#c7d2fe", "#ede9fe", "#f0f9ff"]
        }
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 448,
          alignSelf: "center",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        {stage !== "loading" && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="スキップ"
            onPress={finish}
            disabled={action.pending}
            style={{
              position: "absolute",
              right: 16,
              top: 16,
              zIndex: 50,
              borderRadius: 999,
              backgroundColor: "#ffffffb3",
              paddingHorizontal: 16,
              paddingVertical: 6,
              boxShadow: "0 1px 3px #0003",
            }}
          >
            <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", color: "#475569" }}>
              スキップ
            </Text>
          </Pressable>
        )}
        {stage === "loading" &&
          (query.error ? (
            <Loading error={query.error} retry={query.refetch} />
          ) : (
            <ActivityIndicator
              color="#6ee7b7"
              style={{ position: "absolute", bottom: 24, right: 24 }}
            />
          ))}
        {query.data && (stage === "pack" || stage === "torn") && (
          <Animated.View
            style={{
              marginTop: height * 0.18,
              alignItems: "center",
              opacity: enter,
              transform: [
                {
                  scale: enter.interpolate({
                    inputRange: [0, 1],
                    outputRange: reduce ? [1, 1] : [0.35, 1],
                  }),
                },
              ],
            }}
          >
            <View style={{ width: 256, height: 409.6 }}>
              <Animated.View
                style={{
                  position: "absolute",
                  top: 409.6 * 0.13,
                  left: 0,
                  width: 256,
                  height: 409.6 * 0.87,
                  overflow: "hidden",
                  opacity: torn.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                  transform: [
                    { translateY: torn.interpolate({ inputRange: [0, 1], outputRange: [0, 500] }) },
                  ],
                }}
              >
                <View style={{ marginTop: -409.6 * 0.13 }}>
                  <Pack color={query.data.pack.colorHex} width={256} />
                </View>
              </Animated.View>
              <Animated.View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 256,
                  height: 409.6 * 0.13,
                  overflow: "hidden",
                  opacity: torn.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                  transform: [
                    { translateX: torn.interpolate({ inputRange: [0, 1], outputRange: [0, 160] }) },
                    {
                      translateY: torn.interpolate({ inputRange: [0, 1], outputRange: [0, -220] }),
                    },
                    {
                      rotate: torn.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "35deg"],
                      }),
                    },
                  ],
                }}
              >
                <Pack color={query.data.pack.colorHex} width={256} />
              </Animated.View>
              {stage === "pack" && (
                <View
                  ref={area}
                  testID="tear-area"
                  style={{ position: "absolute", top: "7%", height: "12%", width: "100%" }}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={(e) => {
                    const x = e.nativeEvent.pageX;
                    tearing.current = true;
                    area.current?.measureInWindow((l) => {
                      left.current = l;
                      move(x);
                    });
                  }}
                  onResponderMove={(e) => move(e.nativeEvent.pageX)}
                  onResponderRelease={() => {
                    tearing.current = false;
                    tearProgress.current = 0;
                    setTear(0);
                  }}
                >
                  <View
                    style={{
                      position: "absolute",
                      top: "45%",
                      width: "100%",
                      borderTopWidth: 2,
                      borderStyle: "dashed",
                      borderColor: "#ffffff99",
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      top: "40%",
                      height: 6,
                      width: `${tear * 100}%`,
                      borderRadius: 999,
                      backgroundColor: "white",
                      boxShadow: "0 0 14px 4px #ffffffe6",
                    }}
                  />
                </View>
              )}
            </View>
            <View
              style={{
                width: 192,
                height: 40,
                marginTop: 8,
                borderRadius: 999,
                backgroundColor: "#312e811a",
                filter: "blur(12px)",
              }}
            />
            {stage === "pack" && (
              <>
                <Animated.View style={{ opacity: reduce ? 1 : pulse, marginTop: 24 }}>
                  <Text
                    style={{ fontSize: 14, lineHeight: 20, fontWeight: "700", color: "#475569" }}
                  >
                    パックの上を左から右へなぞって開けよう
                  </Text>
                </Animated.View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="タップで開ける"
                  onPress={tearOpen}
                  style={{ marginTop: 8 }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      lineHeight: 16,
                      color: "#94a3b8",
                      textDecorationLine: "underline",
                    }}
                  >
                    タップで開ける
                  </Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        )}
        {stage === "cards" && current && (
          <View style={{ paddingTop: height * 0.1, alignItems: "center", width: "100%" }}>
            <Text
              style={{
                fontSize: 14,
                lineHeight: 20,
                fontWeight: "700",
                color: "white",
                marginBottom: 12,
                textShadowColor: "#0003",
                textShadowRadius: 2,
              }}
            >
              カードをタップしてめくろう（{index + 1}/{query.data!.cards.length}）
            </Text>
            <View style={{ width: 288 }}>
              {query.data!.cards.slice(index + 1).map((c, i) => (
                <View
                  key={c.userCardId}
                  style={{
                    position: "absolute",
                    top: (i + 1) * 4,
                    left: (i + 1) * 4,
                    width: 288,
                    height: 288,
                    borderRadius: 17,
                    backgroundColor: "white",
                    boxShadow:
                      i === 0 && c.card.rarity === "legendary"
                        ? "0 0 30px 10px #fbbf24e6"
                        : "0 10px 15px #0002",
                  }}
                />
              ))}
              <Animated.View
                style={{
                  opacity: Animated.multiply(
                    cardAnim,
                    exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                  ),
                  transform: [
                    {
                      translateX: exit.interpolate({ inputRange: [0, 1], outputRange: [0, -480] }),
                    },
                    {
                      translateY: cardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [reduce ? 0 : index === 0 ? 400 : 0, 0],
                      }),
                    },
                    {
                      scale: cardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [
                          reduce
                            ? 1
                            : current.card.rarity === "legendary"
                              ? 0.3
                              : current.card.rarity === "double_rare"
                                ? 0.7
                                : 0.96,
                          1,
                        ],
                      }),
                    },
                    {
                      rotateY: cardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [
                          !reduce && current.card.rarity === "legendary" ? "540deg" : "0deg",
                          "0deg",
                        ],
                      }),
                    },
                    {
                      rotate: exit.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "-18deg"],
                      }),
                    },
                  ],
                }}
              >
                {current.isNew && (
                  <View
                    style={{
                      position: "absolute",
                      top: -12,
                      left: -8,
                      zIndex: 10,
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 2,
                      backgroundColor: "#ec4899",
                      boxShadow: "0 1px 3px #0003",
                    }}
                  >
                    <Text
                      style={{ fontSize: 12, lineHeight: 16, fontWeight: "900", color: "white" }}
                    >
                      NEW
                    </Text>
                  </View>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="次のカード"
                  disabled={action.pending}
                  onPress={advance}
                >
                  <Card card={current.card} size="lg" />
                </Pressable>
                {["rare", "double_rare", "legendary"].includes(current.card.rarity) && (
                  <View pointerEvents="none" style={{ position: "absolute", inset: -20 }}>
                    {Array.from(
                      { length: current.card.rarity === "legendary" ? 24 : 12 },
                      (_, i) => (
                        <Text
                          key={i}
                          style={{
                            position: "absolute",
                            left: `${50 + 48 * Math.cos(i * 2.399)}%`,
                            top: `${45 + 43 * Math.sin(i * 2.399)}%`,
                            color: current.card.rarity === "legendary" ? "#fbbf24" : "white",
                            fontSize: 12 + (i % 3) * 4,
                          }}
                        >
                          ✦
                        </Text>
                      ),
                    )}
                  </View>
                )}
              </Animated.View>
            </View>
            <Text
              style={{
                marginTop: 24,
                height: 48,
                fontSize: 32,
                color: current.card.rarity === "legendary" ? "#f59e0b" : "#64748b",
              }}
            >
              {marks[current.card.rarity]}
            </Text>
          </View>
        )}
        {flash && (
          <View
            pointerEvents="none"
            style={{ position: "absolute", inset: 0, backgroundColor: "#ffffff80" }}
          />
        )}
        {!!action.error && (
          <Text accessibilityRole="alert" style={{ color: "#e11d48", margin: 16 }}>
            {action.error}
          </Text>
        )}
      </LinearGradient>
    </View>
  );
}
