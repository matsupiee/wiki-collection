import { Text, TextInput } from "../../../components/typography";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "../../../lib/client";
import { useAction } from "../../../lib/mutation";
import { Button, Card, Confirm, Loading, Screen, Stats } from "../../../components/ui";
import { ElementBadge } from "../../../components/element";
import { formatDateTime, formatDuration, formatPt } from "../../../lib/format";
const muted = { fontSize: 12, lineHeight: 16, color: "#64748b" };
const panel = {
  padding: 20,
  borderRadius: 24,
  backgroundColor: "rgba(255,255,255,.9)",
  boxShadow: "0 1px 2px #0000000d",
};
export default function Listing() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const trpc = useTRPC();
  const q = useQuery(trpc.market.get.queryOptions({ listingId }, { refetchInterval: 15000 }));
  const buy = useMutation(trpc.market.buy.mutationOptions());
  const bid = useMutation(trpc.market.bid.mutationOptions());
  const cancel = useMutation(trpc.market.cancelListing.mutationOptions());
  const action = useAction();
  const [confirm, setConfirm] = useState<"buy" | "bid" | "cancel" | null>(null);
  const [input, setInput] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const d = q.data;
  const amount = Number(input || d?.minNextBid || 0);
  const active = d?.listing.status === "active";
  return (
    <Screen back contentStyle={{ gap: 0, paddingTop: 24 }}>
      {!d ? (
        <Loading error={q.error} retry={q.refetch} />
      ) : (
        <>
          <View style={{ width: 256, alignSelf: "center" }}>
            <Card
              card={d.card}
              size="md"
              elementBadge={<ElementBadge element={d.card.element} />}
            />
            <View style={{ marginTop: 12 }}>
              <Stats attack={d.card.attack} defense={d.card.defense} />
            </View>
          </View>
          <View style={[panel, { marginTop: 20, gap: 12 }]}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 4,
              }}
            >
              <Text style={[muted, { fontWeight: "700" }]}>
                {d.listing.format === "auction" ? "オークション" : "フリマ"}・出品者{" "}
                {d.listing.sellerName}
              </Text>
              {!active && (
                <Text
                  style={[
                    muted,
                    {
                      fontWeight: "700",
                      borderRadius: 999,
                      backgroundColor: "#f1f5f9",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    },
                  ]}
                >
                  {d.listing.status === "sold"
                    ? d.listing.isBuyer
                      ? "あなたが購入しました"
                      : "売り切れ"
                    : "終了しました"}
                </Text>
              )}
            </View>
            <View>
              {d.listing.format === "auction" && (
                <Text style={muted}>{d.listing.bidCount > 0 ? "現在価格" : "開始価格"}</Text>
              )}
              <Text style={{ fontSize: 30, lineHeight: 36, fontWeight: "900", color: "#1e293b" }}>
                {formatPt(
                  d.listing.format === "fixed_price"
                    ? (d.listing.price ?? 0)
                    : (d.listing.currentPrice ?? d.listing.startPrice ?? 0),
                )}
              </Text>
              {active && d.listing.format === "auction" && (
                <Text style={[muted, { fontWeight: "700", color: "#f43f5e" }]}>
                  残り {formatDuration(new Date(d.listing.endsAt!).getTime() - now)}
                </Text>
              )}
              {d.isLeading && (
                <Text style={[muted, { marginTop: 4, fontWeight: "700", color: "#059669" }]}>
                  あなたが最高額です
                </Text>
              )}
            </View>
            {active && d.listing.isMine && (
              <Button
                secondary
                title={
                  d.listing.bidCount > 0 ? "入札があるため取り下げられません" : "出品を取り下げる"
                }
                disabled={d.listing.bidCount > 0}
                style={{ height: 44 }}
                textStyle={{ fontWeight: "800" }}
                onPress={() => setConfirm("cancel")}
              />
            )}
            {active &&
              !d.listing.isMine &&
              d.listing.format === "fixed_price" &&
              (d.balance >= (d.listing.price ?? 0) ? (
                <Button
                  title="購入する"
                  style={{ height: 44 }}
                  textStyle={{ fontWeight: "800" }}
                  onPress={() => setConfirm("buy")}
                />
              ) : (
                <Button
                  title="pt を購入する"
                  style={{ height: 44, backgroundColor: "#fbbf24" }}
                  textStyle={{ fontWeight: "800" }}
                  onPress={() => router.push("/point")}
                />
              ))}
            {active && !d.listing.isMine && d.listing.format === "auction" && !d.isLeading && (
              <View style={{ gap: 8 }}>
                <Text style={[muted, { fontWeight: "700" }]}>
                  入札額（{formatPt(d.minNextBid ?? 0)} 以上）
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    accessibilityLabel={`入札額（${formatPt(d.minNextBid ?? 0)} 以上）`}
                    keyboardType="number-pad"
                    placeholder={String(d.minNextBid ?? "")}
                    value={input}
                    onChangeText={setInput}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 44,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                      paddingHorizontal: 12,
                      fontSize: 14,
                      color: "#1e293b",
                    }}
                  />
                  {d.balance >= amount ? (
                    <Button
                      title="入札"
                      style={{ height: 44, paddingHorizontal: 24 }}
                      textStyle={{ fontWeight: "800" }}
                      disabled={!d.minNextBid || amount < d.minNextBid || !Number.isInteger(amount)}
                      onPress={() => setConfirm("bid")}
                    />
                  ) : (
                    <Button
                      title="pt を購入"
                      style={{ height: 44, backgroundColor: "#fbbf24" }}
                      onPress={() => router.push("/point")}
                    />
                  )}
                </View>
              </View>
            )}
            <Text style={[muted, { color: "#94a3b8" }]}>残高 {formatPt(d.balance)}</Text>
          </View>
          {d.listing.format === "auction" && (
            <View style={[panel, { marginTop: 16 }]}>
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  fontWeight: "800",
                  color: "#1e293b",
                  marginBottom: 8,
                }}
              >
                入札履歴
              </Text>
              {d.bids.length === 0 ? (
                <Text style={muted}>まだ入札はありません</Text>
              ) : (
                <View style={{ gap: 4 }}>
                  {d.bids.map((b) => (
                    <View
                      key={b.id}
                      style={{ flexDirection: "row", justifyContent: "space-between", gap: 4 }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          lineHeight: 20,
                          color: b.isMine ? "#0284c7" : "#1e293b",
                          fontWeight: b.isMine ? "700" : "400",
                        }}
                      >
                        {b.bidderName}
                      </Text>
                      <Text style={[muted, { color: "#94a3b8" }]}>
                        {formatDateTime(b.createdAt)}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          lineHeight: 20,
                          fontWeight: "700",
                          color: "#1e293b",
                        }}
                      >
                        {formatPt(b.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
          {confirm && (
            <Confirm
              title={
                confirm === "cancel"
                  ? "出品を取り下げます"
                  : confirm === "bid"
                    ? "入札します"
                    : "購入します"
              }
              confirmLabel={
                confirm === "cancel" ? "取り下げる" : confirm === "bid" ? "入札する" : "購入する"
              }
              pending={action.pending}
              onCancel={() => setConfirm(null)}
              onConfirm={() =>
                void action.run(
                  () =>
                    confirm === "cancel"
                      ? cancel.mutateAsync({ listingId })
                      : confirm === "bid"
                        ? bid.mutateAsync({ listingId, amount })
                        : buy.mutateAsync({ listingId }),
                  () => setConfirm(null),
                )
              }
            >
              <Text style={{ fontSize: 14, lineHeight: 20, color: "#475569", textAlign: "center" }}>
                {confirm === "cancel"
                  ? "カードは所持中に戻ります。"
                  : confirm === "bid"
                    ? `${formatPt(amount)} で入札します。入札額はすぐに残高から支払われ、ほかの人に抜かれたら戻ります。`
                    : `「${d.card.title}」を ${formatPt(d.listing.price ?? 0)} で購入します。\n購入後の残高 ${formatPt(d.balance - (d.listing.price ?? 0))}`}
              </Text>
              {!!action.error && <Text accessibilityRole="alert">{action.error}</Text>}
            </Confirm>
          )}
        </>
      )}
    </Screen>
  );
}
