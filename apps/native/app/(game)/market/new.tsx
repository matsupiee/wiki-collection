import { Text, TextInput } from "../../../components/typography";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "../../../lib/client";
import { useAction } from "../../../lib/mutation";
import { Button, Card, Loading, Screen } from "../../../components/ui";
import { formatPt } from "../../../lib/format";
const labelStyle = { fontSize: 12, lineHeight: 16, fontWeight: "700" as const, color: "#64748b" };
export default function NewListing() {
  const { userCardId, cardId } = useLocalSearchParams<{ userCardId?: string; cardId?: string }>();
  const trpc = useTRPC();
  const detail = useQuery(
    trpc.card.get.queryOptions({ cardId: cardId ?? "" }, { enabled: !!cardId }),
  );
  const [format, setFormat] = useState<"fixed_price" | "auction">("fixed_price");
  const [price, setPrice] = useState("");
  const [hours, setHours] = useState<24 | 72 | 168>(72);
  const create = useMutation(trpc.market.createListing.mutationOptions());
  const action = useAction();
  const amount = Number(price);
  const valid = Number.isInteger(amount) && amount >= 1;
  const fee = Math.floor(amount * 0.1);
  const choice = (title: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={title}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 999,
        paddingVertical: 6,
        borderWidth: 2,
        borderColor: selected ? "#38bdf8" : "#e2e8f0",
        backgroundColor: selected ? "#f0f9ff" : "transparent",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontSize: 14,
          lineHeight: 20,
          fontWeight: "700",
          color: selected ? "#0284c7" : "#1e293b",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
  return (
    <Screen title="出品" back>
      {!cardId || !userCardId ? (
        <Text style={{ fontSize: 14, color: "#64748b" }}>
          コレクションから出品するカードを選んでください。
        </Text>
      ) : !detail.data ? (
        <Loading error={detail.error} retry={detail.refetch} />
      ) : (
        <>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 12,
              borderRadius: 24,
              backgroundColor: "rgba(255,255,255,.9)",
              boxShadow: "0 1px 2px #0000000d",
            }}
          >
            <View style={{ width: 64 }}>
              <Card card={detail.data.card} size="xs" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "800", color: "#1e293b" }}>
                {detail.data.card.title}
              </Text>
              {detail.data.lowestMarketPrice !== null && (
                <Text style={{ fontSize: 12, lineHeight: 16, color: "#64748b" }}>
                  最安値 {formatPt(detail.data.lowestMarketPrice)}
                </Text>
              )}
            </View>
          </View>
          <View
            style={{
              padding: 20,
              borderRadius: 24,
              backgroundColor: "rgba(255,255,255,.9)",
              boxShadow: "0 1px 2px #0000000d",
            }}
          >
            <Text style={[labelStyle, { marginBottom: 8 }]}>形式</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {choice("フリマ", format === "fixed_price", () => setFormat("fixed_price"))}
              {choice("オークション", format === "auction", () => setFormat("auction"))}
            </View>
            <Text style={[labelStyle, { marginTop: 16, marginBottom: 8 }]}>
              {format === "fixed_price" ? "価格" : "開始価格"}（pt）
            </Text>
            <TextInput
              accessibilityLabel={format === "fixed_price" ? "価格（pt）" : "開始価格（pt）"}
              keyboardType="number-pad"
              value={price}
              onChangeText={setPrice}
              style={{
                height: 44,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderRadius: 999,
                paddingHorizontal: 12,
                fontSize: 14,
                color: "#1e293b",
              }}
            />
            {format === "auction" && (
              <>
                <Text style={[labelStyle, { marginTop: 16, marginBottom: 8 }]}>期間</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {([24, 72, 168] as const).map((h) =>
                    choice(`${h / 24}日`, hours === h, () => setHours(h)),
                  )}
                </View>
              </>
            )}
            <View style={{ marginTop: 16, gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, lineHeight: 20, color: "#64748b" }}>
                  手数料（10%）
                </Text>
                <Text style={{ fontSize: 14, lineHeight: 20, color: "#64748b" }}>
                  -{formatPt(valid ? fee : 0)}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "800", color: "#1e293b" }}>
                  {format === "fixed_price" ? "受け取り" : "受け取り（開始価格で落札のとき）"}
                </Text>
                <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "800", color: "#1e293b" }}>
                  {formatPt(valid ? amount - fee : 0)}
                </Text>
              </View>
            </View>
            <Text style={{ marginTop: 12, fontSize: 11, lineHeight: 16.5, color: "#94a3b8" }}>
              入札が入ったオークションは取り下げられません。
            </Text>
          </View>
          <Button
            title="出品する"
            style={{ height: 48 }}
            textStyle={{ fontSize: 16, fontWeight: "800" }}
            disabled={!valid || action.pending}
            onPress={() =>
              void action.run(async () => {
                const result = await create.mutateAsync(
                  format === "fixed_price"
                    ? { format, userCardId, price: amount }
                    : { format, userCardId, startPrice: amount, durationHours: hours },
                );
                router.replace(`/market/${result.listingId}`);
              })
            }
          />
          {!!action.error && (
            <Text accessibilityRole="alert" style={{ fontSize: 14, color: "#e11d48" }}>
              {action.error}
            </Text>
          )}
        </>
      )}
    </Screen>
  );
}
