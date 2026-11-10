import { Text } from "@/components/typography";
import { useState, useMemo, useEffect, type ComponentProps } from "react";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  clamp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
  useReducedMotion,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { router } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/client";
import { useAction } from "@/lib/mutation";
import { Button, Confirm, Loading, Screen, styles } from "@/components/ui";
import { CoinIcon } from "@/components/brand";
import { OpeningPack } from "@/components/opening-pack";
import { formatClock, formatPt } from "@/lib/format";
const packWidth = 178;

const packSpacing = 150;
const snapSpring = { duration: 400, dampingRatio: 1, overshootClamping: true };

function CarouselItem({
  index,
  position,
  slug,
  ...pressableProps
}: {
  index: number;
  position: SharedValue<number>;
  slug: string;
} & ComponentProps<typeof Pressable>) {
  const reducedMotion = useReducedMotion();
  const style = useAnimatedStyle(() => {
    const offset = index - position.get();
    const distance = Math.min(1, Math.abs(offset));
    return {
      zIndex: Math.round(100 * (1 - distance)),
      opacity: 1 - distance * 0.3,
      transform: [
        { translateX: offset * packSpacing },
        { translateY: reducedMotion ? -8 : -8 + 48 * distance },
        { scale: reducedMotion ? 1 : 1 - distance * 0.32 },
      ],
    };
  });
  const reflection = useAnimatedStyle(() => ({
    opacity: 0.14 * Math.max(0, 1 - Math.abs(index - position.get())),
  }));
  return (
    <Animated.View
      style={[{ position: "absolute", top: 8, left: "50%", marginLeft: -packWidth / 2 }, style]}
    >
      <Pressable {...pressableProps}>
        <OpeningPack slug={slug} width={packWidth} />
      </Pressable>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            height: 42,
            width: packWidth,
            justifyContent: "flex-end",
            overflow: "hidden",
            marginTop: 4,
            filter: "blur(1px)",
            transform: [{ scaleY: -1 }],
          },
          reflection,
        ]}
      >
        <OpeningPack slug={slug} width={packWidth} />
      </Animated.View>
    </Animated.View>
  );
}

export default function Packs() {
  const trpc = useTRPC();
  const packs = useQuery(trpc.pack.list.queryOptions());
  const [requiredPoints, setRequiredPoints] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const p = packs.data?.packs[index];
  const freePack = p?.type === "free_basic" ? packs.data?.freePack : undefined;
  const waitingForRefill = freePack?.remaining === 0;
  const open = useMutation(trpc.pack.open.mutationOptions());
  const action = useAction();
  const position = useSharedValue(0);
  const origin = useSharedValue(0);
  const dragged = useSharedValue(false);
  const lastIndex = Math.max(0, (packs.data?.packs.length ?? 0) - 1);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-6, 6])
        .failOffsetY([-12, 12])
        .onTouchesDown(() => {
          dragged.set(false);
        })
        .onStart(() => {
          dragged.set(true);
          cancelAnimation(position);
          origin.set(position.get());
        })
        .onUpdate((event) => {
          position.set(clamp(origin.get() - event.translationX / packSpacing, 0, lastIndex));
        })
        .onFinalize((event, success) => {
          if (!dragged.get()) return;
          const velocity = success ? -event.velocityX / packSpacing : 0;
          const target = clamp(
            Math.round(position.get() + clamp(velocity * 0.15, -0.5, 0.5)),
            0,
            lastIndex,
          );
          position.set(withSpring(target, { ...snapSpring, velocity }));
          scheduleOnRN(setIndex, target);
        }),
    [dragged, lastIndex, origin, position],
  );
  function selectPack(next: number) {
    position.set(withSpring(next, snapSpring));
    setIndex(next);
  }
  return (
    <Screen contentStyle={{ flexGrow: 1, gap: 0, paddingTop: 72, paddingBottom: 32 }}>
      {!packs.data ? (
        <Loading error={packs.error} retry={packs.refetch} />
      ) : (
        <>
          <GestureDetector gesture={pan} touchAction="pan-y">
            <View
              collapsable={false}
              style={{ height: 360, marginTop: 0, width: "100%", overflow: "hidden" }}
            >
              {packs.data.packs.map((pack, i) => {
                const offset = i - index;
                return (
                  <CarouselItem
                    key={pack.id}
                    index={i}
                    position={position}
                    slug={pack.slug}
                    accessibilityRole="button"
                    accessibilityLabel={offset === 0 ? `${pack.name}を選ぶ` : pack.name}
                    accessibilityState={{ selected: offset === 0 }}
                    disabled={action.pending}
                    onPress={() => {
                      if (!dragged.get() && offset !== 0) selectPack(i);
                    }}
                  />
                );
              })}
            </View>
          </GestureDetector>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 }}>
            {packs.data.packs.map((pack, i) => (
              <Pressable
                key={pack.id}
                accessibilityRole="button"
                accessibilityLabel={`${pack.name}へ`}
                onPress={() => selectPack(i)}
                style={{
                  width: i === index ? 24 : 8,
                  height: 8,
                  borderRadius: 8,
                  backgroundColor: i === index ? "#0ea5e9" : "#cbd5e1",
                }}
              />
            ))}
          </View>
          <View style={{ marginTop: 16, alignItems: "center" }}>
            <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "800", color: "#1e293b" }}>
              {p?.name}
            </Text>
            <Text style={{ fontSize: 14, lineHeight: 20, color: "#475569", textAlign: "center" }}>
              {p?.description}
            </Text>
          </View>
          {!!action.error && (
            <Text
              accessibilityRole="alert"
              style={{ fontSize: 12, color: "#e11d48", textAlign: "center" }}
            >
              {action.error}
            </Text>
          )}
          {p && (
            <View style={{ marginTop: "auto", paddingTop: 20, gap: 8 }}>
              {freePack && !freePack.nextRefillAt && (
                <Text style={[styles.muted, { textAlign: "center" }]}>
                  10分で1パック回復（最大{freePack.limit}パック）
                </Text>
              )}
              <Button
                title={
                  waitingForRefill && freePack.nextRefillAt
                    ? `次の無料パックまで ${formatClock(Date.parse(freePack.nextRefillAt) - now)}`
                    : freePack
                      ? "無料で開封する"
                      : `${formatPt(p.priceCoins ?? 0)} で開封する`
                }
                icon={freePack ? undefined : <CoinIcon />}
                disabled={action.pending || waitingForRefill}
                onPress={() =>
                  void action.run(async () => {
                    try {
                      const result = await open.mutateAsync({ packId: p.id });
                      router.push(`/openings/${result.openingId}`);
                    } catch (error) {
                      if (error instanceof Error && error.message === "pt が足りません") {
                        setRequiredPoints(p.priceCoins ?? 0);
                        return;
                      }
                      throw error;
                    }
                  })
                }
              />
            </View>
          )}
          {requiredPoints !== null && (
            <Confirm
              title="ポイントが不足しています"
              confirmLabel="ポイント購入へ"
              onCancel={() => setRequiredPoints(null)}
              onConfirm={() => {
                setRequiredPoints(null);
                router.push("/point");
              }}
            >
              <Text style={styles.text}>
                このパックの開封には{formatPt(requiredPoints)}が必要です。
              </Text>
            </Confirm>
          )}
        </>
      )}
    </Screen>
  );
}
