import { useTranslation } from "@/lib/i18n";
import { auctionDurationHours, minimumAuctionPrice } from "@wiki-collection/db/enums";
import { Text, TextInput } from "@/components/typography";
import { useState } from "react";
import { Select } from "@/components/select";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/client";
import { useAction } from "@/lib/mutation";
import { Button, Card, Loading, Screen } from "@/components/ui";
import { formatPt } from "@/lib/format";
const labelStyle = { fontSize: 12, lineHeight: 16, fontWeight: "700" as const, color: "#64748b" };
export default function NewListing() {
  const t = useTranslation();
  const { userCardId, cardId } = useLocalSearchParams<{ userCardId?: string; cardId?: string }>();
  const trpc = useTRPC();
  const detail = useQuery(
    trpc.card.get.queryOptions({ cardId: cardId ?? "" }, { enabled: !!cardId }),
  );
  const [price, setPrice] = useState("");
  const [hours, setHours] = useState(24);
  const create = useMutation(trpc.market.createListing.mutationOptions());
  const action = useAction();
  const amount = Number(price);
  const valid = Number.isInteger(amount) && amount >= minimumAuctionPrice;
  return (
    <Screen title={t("newListing")} back>
      {!cardId || !userCardId ? (
        <Text style={{ fontSize: 14, color: "#64748b" }}>{t("chooseFromCollection")}</Text>
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
                  {t("lowestPrice", { price: formatPt(detail.data.lowestMarketPrice) })}
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
            <Text style={[labelStyle, { marginTop: 16, marginBottom: 8 }]}>
              {t("startingPoints")}
            </Text>
            <TextInput
              accessibilityLabel={t("startingPoints")}
              placeholder={t("minimumPrice", { price: minimumAuctionPrice })}
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

            <Text style={[labelStyle, { marginTop: 16, marginBottom: 8 }]}>{t("duration")}</Text>
            <Select
              label={t("duration")}
              value={String(hours)}
              options={auctionDurationHours.map((h) => ({
                value: String(h),
                label: t("hours", { hours: h }),
              }))}
              onChange={(value) => setHours(Number(value))}
            />
            <Text style={{ marginTop: 12, fontSize: 11, lineHeight: 16.5, color: "#94a3b8" }}>
              {t("withdrawalRule")}
            </Text>
          </View>
          <Button
            title={t("listCard")}
            style={{ height: 48 }}
            textStyle={{ fontSize: 16, fontWeight: "800" }}
            disabled={!valid || action.pending}
            onPress={() =>
              void action.run(async () => {
                const result = await create.mutateAsync({
                  format: "auction",
                  userCardId,
                  startPrice: amount,
                  durationHours: hours,
                });
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
