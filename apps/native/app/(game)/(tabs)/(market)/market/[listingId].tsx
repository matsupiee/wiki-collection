import { auctionRefreshInterval } from "@/lib/auction";
import { useTranslation } from "@/lib/i18n";
import { Text, TextInput } from "@/components/typography";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/client";
import { useAction } from "@/lib/mutation";
import { Button, Card, Confirm, Loading, Screen } from "@/components/ui";
import { formatDateTime, formatDuration, formatPt } from "@/lib/format";
const muted = { fontSize: 12, lineHeight: 16, color: "#64748b" };
const panel = {
  padding: 20,
  borderRadius: 24,
  backgroundColor: "rgba(255,255,255,.9)",
  boxShadow: "0 1px 2px #0000000d",
};
export default function Listing() {
  const t = useTranslation();
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const trpc = useTRPC();
  const q = useQuery(
    trpc.market.get.queryOptions(
      { listingId },
      {
        refetchInterval: (query) => {
          const listing = query.state.data?.listing;
          if (!listing?.endsAt || listing.status !== "active") return false;
          return auctionRefreshInterval(listing.endsAt);
        },
      },
    ),
  );
  const bid = useMutation(trpc.market.bid.mutationOptions());
  const cancel = useMutation(trpc.market.cancelListing.mutationOptions());
  const action = useAction();
  const [confirm, setConfirm] = useState<"bid" | "cancel" | "purchase" | null>(null);
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
            <Card card={d.card} size="md" />
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
                {t("seller", {
                  format: d.listing.format === "auction" ? t("auction") : t("pastTrade"),
                  name: d.listing.sellerName,
                })}
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
                      ? t("youBought")
                      : t("soldOut")
                    : t("ended")}
                </Text>
              )}
            </View>
            <View>
              {d.listing.format === "auction" && (
                <Text style={muted}>
                  {d.listing.bidCount > 0 ? t("currentPrice") : t("startingPrice")}
                </Text>
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
                  {t("timeLeft", {
                    time: formatDuration(new Date(d.listing.endsAt!).getTime() - now),
                  })}
                </Text>
              )}
              {d.isLeading && (
                <Text style={[muted, { marginTop: 4, fontWeight: "700", color: "#059669" }]}>
                  {t("leading")}
                </Text>
              )}
            </View>
            {active && d.listing.isMine && (
              <Button
                secondary
                title={d.listing.bidCount > 0 ? t("cannotWithdraw") : t("withdrawListing")}
                disabled={d.listing.bidCount > 0}
                style={{ height: 44 }}
                textStyle={{ fontWeight: "800" }}
                onPress={() => setConfirm("cancel")}
              />
            )}
            {active && !d.listing.isMine && d.listing.format === "auction" && !d.isLeading && (
              <View style={{ gap: 8 }}>
                <Text style={[muted, { fontWeight: "700" }]}>
                  {t("minBidLabel", { price: formatPt(d.minNextBid ?? 0) })}
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    accessibilityLabel={t("minBidLabel", { price: formatPt(d.minNextBid ?? 0) })}
                    testID="bid-amount"
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
                  <Button
                    title={t("bid")}
                    style={{ height: 44, paddingHorizontal: 24 }}
                    textStyle={{ fontWeight: "800" }}
                    disabled={
                      !d.minNextBid ||
                      amount < d.minNextBid ||
                      !Number.isInteger(amount) ||
                      amount > 10_000_000
                    }
                    onPress={() => {
                      setInput(String(amount));
                      action.clearError();
                      setConfirm(d.balance < amount ? "purchase" : "bid");
                    }}
                  />
                </View>
              </View>
            )}
            <Text style={[muted, { color: "#94a3b8" }]}>
              {t("balance", { points: formatPt(d.balance) })}
            </Text>
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
                {t("bidHistory")}
              </Text>
              {d.bids.length === 0 ? (
                <Text style={muted}>{t("noBids")}</Text>
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
          {confirm === "purchase" && (
            <Confirm
              title={t("shortfall")}
              confirmLabel={t("getPoints")}
              onCancel={() => setConfirm(null)}
              onConfirm={() => {
                setConfirm(null);
                router.push("/point");
              }}
            >
              <Text style={{ textAlign: "center" }}>
                {t("bidShortfall", {
                  amount: formatPt(amount),
                  missing: formatPt(Math.max(0, amount - d.balance)),
                })}
              </Text>
            </Confirm>
          )}
          {(confirm === "cancel" || confirm === "bid") && (
            <Confirm
              title={confirm === "cancel" ? t("confirmWithdrawal") : t("confirmBid")}
              confirmLabel={confirm === "cancel" ? t("withdraw") : t("placeBid")}
              pending={action.pending}
              onCancel={() => setConfirm(null)}
              onConfirm={() =>
                void action.run(
                  () =>
                    confirm === "cancel"
                      ? cancel.mutateAsync({ listingId })
                      : bid.mutateAsync({ listingId, amount }),
                  () => setConfirm(null),
                )
              }
            >
              <Text style={{ fontSize: 14, lineHeight: 20, color: "#475569", textAlign: "center" }}>
                {confirm === "cancel"
                  ? t("cardReturned")
                  : t("bidTerms", { amount: formatPt(amount) })}
              </Text>
              {!!action.error && <Text accessibilityRole="alert">{action.error}</Text>}
            </Confirm>
          )}
        </>
      )}
    </Screen>
  );
}
