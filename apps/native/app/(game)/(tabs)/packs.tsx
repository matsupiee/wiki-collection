import { Text } from "../../../components/typography";
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
import { useTRPC } from "../../../lib/client";
import { useAction } from "../../../lib/mutation";
import { Button, Loading, Screen } from "../../../components/ui";
import { OpeningPack } from "../../../components/opening-pack";
import { formatClock, formatPt } from "../../../lib/format";
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
  const packs = useQuery(
    trpc.pack.list.queryOptions(undefined, {
      refetchInterval: (query) => {
        const next = query.state.data?.freePack.nextRefillAt;
        return next ? Math.max(1000, Date.parse(next) - Date.now()) : false;
      },
    }),
  );
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const p = packs.data?.packs[index];
  const detail = useQuery(trpc.pack.get.queryOptions({ slug: p?.slug ?? "" }, { enabled: !!p }));
  const canOpen =
    p?.type === "free_basic" ? (packs.data?.freePack.remaining ?? 0) > 0 : detail.data?.canOpen;
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
          // Keep the release from also opening the pack, even when it settles at its starting point.
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
    <Screen contentStyle={{ flexGrow: 1, gap: 0, paddingTop: 32, paddingBottom: 32 }}>
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
                    disabled={action.pending || (offset === 0 && !canOpen)}
                    onPress={() => {
                      if (dragged.get()) return;
                      if (offset !== 0) {
                        selectPack(i);
                        return;
                      }
                      if (Math.abs(position.get() - i) > 0.01) return;
                      void action.run(async () => {
                        const result = await open.mutateAsync({ packId: pack.id });
                        router.push(`/openings/${result.openingId}`);
                      });
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
          {detail.data && (action.pending || p?.type !== "free_basic") && (
            <View style={{ marginVertical: 16, gap: 12 }}>
              <Text style={{ fontSize: 12, lineHeight: 16, color: "#475569", textAlign: "center" }}>
                {action.pending
                  ? "準備中…"
                  : `タップで ${formatPt(p?.priceCoins ?? 0)} を使って開封（残高 ${formatPt(detail.data.balance)}）`}
              </Text>
              {detail.data.blockedReason === "insufficient_coins" && (
                <Button
                  variant="link"
                  title="pt が不足しています。pt を購入する"
                  textStyle={{ fontSize: 12 }}
                  onPress={() => router.push("/point")}
                />
              )}
            </View>
          )}
          {!!action.error && (
            <Text
              accessibilityRole="alert"
              style={{ fontSize: 12, color: "#e11d48", textAlign: "center" }}
            >
              {action.error}
            </Text>
          )}
          {detail.error && <Loading error={detail.error} retry={detail.refetch} />}
          <View
            style={{
              marginTop: "auto",
              padding: 16,
              borderRadius: 24,
              backgroundColor: "rgba(255,255,255,.8)",
              boxShadow: "0 1px 2px #0000000d",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, lineHeight: 28, fontWeight: "700", color: "#334155" }}>
              無料パック 残り{" "}
              <Text style={{ fontSize: 24, fontWeight: "900", color: "#7c3aed" }}>
                {packs.data.freePack.remaining}
              </Text>
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 16, color: "#64748b" }}>
              {packs.data.freePack.nextRefillAt
                ? `次の無料パックまで ${formatClock(Date.parse(packs.data.freePack.nextRefillAt) - now)}`
                : `10分で1パック回復（最大${packs.data.freePack.limit}パック）`}
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}
