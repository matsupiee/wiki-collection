import { Text } from "../../../components/typography";
import { useState, useRef, useEffect } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "../../../lib/client";
import { useAction } from "../../../lib/mutation";
import { Button, Loading, Screen } from "../../../components/ui";
import { OpeningPack } from "../../../components/opening-pack";
import { formatClock, formatPt } from "../../../lib/format";
const packWidth = 178;

export default function Packs() {
  const trpc = useTRPC();
  const packs = useQuery(trpc.pack.list.queryOptions());
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const p = packs.data?.packs[index];
  const detail = useQuery(trpc.pack.get.queryOptions({ slug: p?.slug ?? "" }, { enabled: !!p }));
  const open = useMutation(trpc.pack.open.mutationOptions());
  const action = useAction();
  const start = useRef(0);
  const swiped = useRef(false);
  return (
    <Screen contentStyle={{ flexGrow: 1, gap: 0, paddingTop: 32, paddingBottom: 32 }}>
      {!packs.data ? (
        <Loading error={packs.error} retry={packs.refetch} />
      ) : (
        <>
          <View
            style={{ height: 352, marginTop: 8, width: "100%", overflow: "visible" }}
            onTouchStart={(e) => {
              start.current = e.nativeEvent.pageX;
              swiped.current = false;
            }}
            onTouchMove={(e) => {
              if (Math.abs(e.nativeEvent.pageX - start.current) > 40) swiped.current = true;
            }}
            onTouchEnd={(e) => {
              const dx = e.nativeEvent.pageX - start.current;
              if (Math.abs(dx) > 40) {
                swiped.current = true;
                setIndex((i) =>
                  Math.min(packs.data.packs.length - 1, Math.max(0, i + (dx < 0 ? 1 : -1))),
                );
              }
            }}
          >
            {packs.data.packs.map((pack, i) => {
              const offset = i - index;
              if (Math.abs(offset) > 1) return null;
              return (
                <Pressable
                  key={pack.id}
                  accessibilityRole="button"
                  accessibilityLabel={offset === 0 ? `${pack.name}を選ぶ` : pack.name}
                  disabled={action.pending || (offset === 0 && !detail.data?.canOpen)}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    marginLeft: -packWidth / 2,
                    zIndex: offset === 0 ? 10 : 1,
                    opacity: offset === 0 ? 1 : 0.7,
                    transform: [
                      { translateX: offset * 150 },
                      { translateY: offset === 0 ? -8 : 40 },
                      { scale: offset === 0 ? 1 : 0.68 },
                    ],
                  }}
                  onPress={() => {
                    if (swiped.current) return;
                    if (offset !== 0) {
                      setIndex(i);
                      return;
                    }
                    void action.run(async () => {
                      const result = await open.mutateAsync({ packId: pack.id });
                      router.push(`/openings/${result.openingId}`);
                    });
                  }}
                >
                  <OpeningPack slug={pack.slug} width={packWidth} />
                  {offset === 0 && (
                    <View
                      pointerEvents="none"
                      style={{
                        height: 42,
                        width: packWidth,
                        justifyContent: "flex-end",
                        overflow: "hidden",
                        marginTop: 4,
                        alignSelf: "center",
                        opacity: 0.14,
                        filter: "blur(1px)",
                        transform: [{ scaleY: -1 }],
                      }}
                    >
                      <OpeningPack slug={pack.slug} width={packWidth} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 }}>
            {packs.data.packs.map((pack, i) => (
              <Pressable
                key={pack.id}
                accessibilityRole="button"
                accessibilityLabel={`${pack.name}へ`}
                onPress={() => setIndex(i)}
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
              {packs.data.freePack.remaining > 0 ? "無料パック 残り " : "次の無料パックまで "}
              <Text
                style={{
                  fontSize: packs.data.freePack.remaining > 0 ? 24 : 20,
                  fontWeight: "900",
                  color: "#7c3aed",
                }}
              >
                {packs.data.freePack.remaining > 0
                  ? packs.data.freePack.remaining
                  : formatClock(new Date(packs.data.freePack.dailyResetsAt).getTime() - now)}
              </Text>
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 16, color: "#64748b" }}>
              {packs.data.freePack.remaining > 0
                ? `今日の分 ${packs.data.freePack.dailyRemaining}/${packs.data.freePack.dailyLimit}`
                : "毎日 0 時に 10 パック開けられるようになります"}
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}
