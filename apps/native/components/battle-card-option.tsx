import { useState, type ReactNode } from "react";
import { View, Image, Pressable } from "react-native";
import { cardImageDisplayUrl } from "@wiki-collection/db/card-image";
import { apiUrl } from "../lib/client";
import { Text } from "./typography";
export type PickerCard = {
  id: string;
  title: string;
  imageUrl: string | null;
  attack: number;
  defense: number | null;
  attackBonus: number;
  defenseBonus: number;
};
export function BattleArtwork({
  card,
  fontSize = 30,
  children,
}: {
  card: PickerCard;
  fontSize?: number;
  children?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <View
      style={{
        width: "100%",
        aspectRatio: 1,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "#f0f9ff",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {card.imageUrl && !failed ? (
        <Image
          source={{ uri: new URL(cardImageDisplayUrl(card.imageUrl), apiUrl).href }}
          onError={() => setFailed(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
      ) : (
        <Text
          style={{
            fontSize,
            lineHeight: fontSize === 20 ? 28 : 36,
            fontWeight: "700",
            color: "#0369a1",
          }}
        >
          {Array.from(card.title)[0]}
        </Text>
      )}
      {children}
    </View>
  );
}
export function BattleCardOption({
  card,
  selected,
  onSelect,
  disabled = false,
  selectionLabel = "選択中",
}: {
  card: PickerCard;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  selectionLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.title}、攻撃 ${card.attack.toLocaleString("ja-JP")}、防御 ${card.defense?.toLocaleString("ja-JP") ?? "未計測"}を選ぶ`}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onSelect}
      style={{ opacity: disabled ? 0.4 : 1, width: "100%", minWidth: 0 }}
    >
      <View
        style={selected ? { borderRadius: 8, boxShadow: "0 0 0 2px white, 0 0 0 4px #0284c7" } : {}}
      >
        <BattleArtwork card={card}>
          {selected && (
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "#0369a1",
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  lineHeight: 15,
                  fontWeight: "700",
                  color: "white",
                  textAlign: "center",
                }}
              >
                {selectionLabel}
              </Text>
            </View>
          )}
        </BattleArtwork>
      </View>
      <Text
        numberOfLines={2}
        style={{
          marginTop: 8,
          fontSize: 12,
          lineHeight: 16.5,
          fontWeight: "600",
          color: "#1e293b",
        }}
      >
        {card.title}
      </Text>
      <Text style={{ fontSize: 10, lineHeight: 16.25, color: "#475569" }}>
        攻 {card.attack.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}
        {"\n"}防 {(card.defense ?? 0).toLocaleString("ja-JP", { maximumFractionDigits: 2 })}
      </Text>
      {(card.attackBonus > 0 || card.defenseBonus > 0) && (
        <Text style={{ fontSize: 10, lineHeight: 15, color: "#0369a1" }}>強化済み</Text>
      )}
    </Pressable>
  );
}
