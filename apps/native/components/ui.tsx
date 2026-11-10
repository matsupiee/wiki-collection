import { cardImageDisplayUrl } from "@wiki-collection/db/card-image";
import { Text, TextInput } from "./typography";
import { AppBackground } from "./app-background";
import { Brand, CoinIcon } from "./brand";
import { ChevronLeft, Swords, Shield } from "lucide-react-native";
import type { HistoricalElement } from "@wiki-collection/db/battle";
import { ElementSymbol } from "./element-symbol";
import { useEffect, useState } from "react";
import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import type { TextInputProps, StyleProp, ViewStyle, TextStyle } from "react-native";
import { router, useSegments } from "expo-router";
import { Platform } from "react-native";
import { SafeAreaView } from "react-native-screens/experimental";

import { useQuery } from "@tanstack/react-query";
import { apiUrl, useTRPC } from "../lib/client";

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  content: {
    width: "100%",
    maxWidth: 448,
    alignSelf: "center",
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  header: { backgroundColor: "rgba(255,255,255,.9)" },
  headerInner: {
    width: "100%",
    maxWidth: 448,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
  },
  title: { fontSize: 18, lineHeight: 28, fontWeight: "800", color: "#1e293b" },
  text: { color: "#334155", fontSize: 14, lineHeight: 22 },
  muted: { color: "#64748b", fontSize: 12, lineHeight: 20 },
  panel: {
    backgroundColor: "rgba(255,255,255,.9)",
    padding: 16,
    borderRadius: 24,
    gap: 12,
    boxShadow: "0 1px 2px #0000000d",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  button: {
    backgroundColor: "#0ea5e9",
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  buttonText: { color: "white", fontSize: 14, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 12,
    color: "#0f172a",
    fontSize: 16,
  },
});
export function Button({
  title,
  onPress,
  disabled,
  secondary,
  variant,
  size = "normal",
  style,
  textStyle,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  variant?: "primary" | "outline" | "chip" | "link";
  size?: "normal" | "compact";
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const mode = variant ?? (secondary ? "outline" : "primary");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        mode === "outline" && {
          backgroundColor: "rgba(255,255,255,.9)",
          borderWidth: 1,
          borderColor: "#e2e8f0",
        },
        mode === "chip" && {
          backgroundColor: "white",
          paddingHorizontal: 12,
          paddingVertical: 4,
          boxShadow: "0 1px 2px #0000000d",
        },
        mode === "link" && {
          backgroundColor: "transparent",
          paddingHorizontal: 0,
          paddingVertical: 0,
        },
        size === "compact" && { paddingHorizontal: 12, paddingVertical: 4 },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          { lineHeight: 20 },
          mode !== "primary" && { color: mode === "link" ? "#0284c7" : "#334155" },
          (mode === "chip" || size === "compact") && { fontSize: 12, lineHeight: 16 },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field(props: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.muted}>{props.label}</Text>
      <TextInput
        autoCapitalize="none"
        {...props}
        accessibilityLabel={props.label}
        style={styles.input}
      />
    </View>
  );
}
export function Panel({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.panel, style]}>{children}</View>;
}
export function Screen({
  children,
  title = "Wiki Collection",
  back = false,
  hideBrand = false,
  contentStyle,
  scroll = true,
}: PropsWithChildren<{
  title?: string;
  back?: boolean;
  hideBrand?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
}>) {
  const trpc = useTRPC();
  const balance = useQuery(trpc.coin.getBalance.queryOptions());
  const segments = useSegments();
  const nativeTabs = Platform.OS === "ios" && segments.some((segment) => segment === "(tabs)");
  return (
    <View collapsable={false} style={styles.screen}>
      <AppBackground />
      <SafeAreaView edges={{ bottom: nativeTabs }} style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.headerInner}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}
            >
              {back && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="もどる"
                  onPress={() => (router.canGoBack() ? router.back() : router.replace("/packs"))}
                  style={{ marginLeft: -8, padding: 4, borderRadius: 999 }}
                >
                  <ChevronLeft size={24} color="#64748b" />
                </Pressable>
              )}
              {title && title !== "Wiki Collection" ? (
                <Text numberOfLines={1} style={styles.title}>
                  {title}
                </Text>
              ) : !hideBrand && title !== "" ? (
                <Brand />
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ポイント購入"
              onPress={() => router.push("/point")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderRadius: 999,
                paddingVertical: 4,
                paddingLeft: 4,
                paddingRight: 12,
                backgroundColor: "rgba(255,255,255,.9)",
                borderWidth: 1,
                borderColor: "#e2e8f0",
                boxShadow: "0 1px 2px #0000000d",
              }}
            >
              <CoinIcon />
              <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "800", color: "#334155" }}>
                {balance.data ? `${balance.data.total.toLocaleString("ja-JP")}pt` : "…"}
              </Text>
            </Pressable>
          </View>
        </View>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}
export function Loading({
  error,
  retry,
}: {
  error?: { message: string } | null;
  retry?: () => unknown;
}) {
  return error ? (
    <Panel>
      <Text accessibilityRole="alert" style={styles.text}>
        {error.message}
      </Text>
      {retry && <Button title="再試行" onPress={() => void retry()} />}
    </Panel>
  ) : (
    <ActivityIndicator
      accessibilityLabel="読み込み中"
      size="large"
      color="#0ea5e9"
      style={{ margin: 32 }}
    />
  );
}
export const marks: Record<string, string> = {
  common: "◇",
  uncommon: "◇◇",
  rare: "◇◇◇",
  double_rare: "◇◇◇◇",
  legendary: "☆",
};
export type CardArtData = { title: string; imageUrl: string | null; genreColorHex?: string };
export function CardArt({
  card,
  effectiveSize = "md",
  ownedCount,
}: {
  card: CardArtData;
  effectiveSize?: "xs" | "sm" | "md" | "lg";
  ownedCount?: number;
}) {
  const [failed, setFailed] = useState(false);
  const uri = card.imageUrl ? new URL(cardImageDisplayUrl(card.imageUrl), apiUrl).href : null;
  useEffect(() => setFailed(false), [uri]);
  return (
    <View
      style={{
        width: "100%",
        aspectRatio: 1,
        borderRadius: "6%",
        overflow: "hidden",
        backgroundColor: card.genreColorHex ?? "#818cf8",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {uri && !failed ? (
        <Image
          resizeMode="cover"
          source={{ uri }}
          onError={() => setFailed(true)}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        />
      ) : (
        <Text
          style={{
            color: "white",
            fontSize: { xs: 20, sm: 36, md: 72, lg: 96 }[effectiveSize],
            lineHeight: { xs: 28, sm: 40, md: 72, lg: 96 }[effectiveSize],
            fontWeight: "600",
          }}
        >
          {Array.from(card.title)[0]}
        </Text>
      )}
      {ownedCount !== undefined && ownedCount > 0 && (
        <View
          style={{
            position: "absolute",
            right: 6,
            bottom: 6,
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 2,
            backgroundColor: "rgba(15,23,42,.75)",
          }}
        >
          <Text style={{ color: "white", fontSize: 12, lineHeight: 16, fontWeight: "700" }}>
            ×{ownedCount}
          </Text>
        </View>
      )}
    </View>
  );
}
export function Card({
  card,
  small = false,
  size,
  onPress,
  ownedCount,
  elementBadge,
}: {
  card: {
    title: string;
    imageUrl: string | null;
    genreColorHex?: string;
    rarity?: string;
    element?: HistoricalElement;
  };
  small?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  onPress?: () => void;
  ownedCount?: number;
  elementBadge?: ReactNode;
}) {
  const effectiveSize = size ?? (small ? "sm" : "md");
  const showText = effectiveSize !== "xs";
  const art = <CardArt card={card} effectiveSize={effectiveSize} ownedCount={ownedCount} />;
  const title = (
    <Text
      numberOfLines={2}
      style={{
        fontSize: effectiveSize === "sm" ? 12 : 16,
        lineHeight: effectiveSize === "sm" ? 16.5 : 22,
        fontWeight: "600",
        color: "#1e293b",
      }}
    >
      {card.title}
    </Text>
  );
  return (
    <View
      style={{
        width: size ? { xs: 64, sm: 112, md: 256, lg: 288 }[size] : "100%",
        maxWidth: "100%",
        minWidth: 0,
      }}
    >
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${card.title}の詳細を見る`}
          onPress={onPress}
        >
          {art}
        </Pressable>
      ) : (
        art
      )}
      {showText && (
        <View style={{ marginTop: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {card.element && (elementBadge ?? <ElementSymbol element={card.element} compact />)}
            {onPress ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${card.title}の詳細を見る`}
                onPress={onPress}
                style={{ flex: 1, minWidth: 0 }}
              >
                {title}
              </Pressable>
            ) : (
              <View style={{ flex: 1, minWidth: 0 }}>{title}</View>
            )}
          </View>
          {(effectiveSize === "md" || effectiveSize === "lg") && card.rarity && (
            <Text
              style={{
                marginTop: 8,
                color: card.rarity === "legendary" ? "#f59e0b" : "#64748b",
                fontSize: 12,
                lineHeight: 24,
                fontWeight: "700",
              }}
            >
              {marks[card.rarity]}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
export function Stats({
  attack,
  defense,
  compact = false,
  prominent = false,
}: {
  attack: number;
  defense: number | null;
  compact?: boolean;
  prominent?: boolean;
}) {
  const { width } = useWindowDimensions();
  const fontSize = prominent ? 20 : compact ? Math.max(7, Math.min(9, width * 0.021)) : 12;
  const iconSize = prominent ? 20 : compact ? fontSize : 14;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ maxWidth: "100%" }}
      contentContainerStyle={{
        flexDirection: "row",
        alignItems: "center",
        gap: prominent ? 24 : compact ? 4 : 16,
        paddingVertical: prominent ? 8 : 0,
      }}
    >
      {(
        [
          { value: attack, name: "攻撃", Icon: Swords, color: "#ea580c" },
          { value: defense, name: "防御", Icon: Shield, color: "#0284c7" },
        ] as const
      ).map(({ value, name, Icon, color }) => (
        <View
          key={name}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: compact ? 2 : 8,
            flexShrink: 0,
          }}
        >
          <Icon size={iconSize} color={color} />
          <Text
            accessibilityLabel={`${name}力 ${value ?? "未計測"}`}
            style={{
              fontSize,
              lineHeight: prominent ? 28 : compact ? fontSize * 1.5 : 16,
              fontWeight: compact && !prominent ? "400" : "700",
              color: prominent ? "#1e293b" : "#475569",
              fontVariant: ["tabular-nums"],
            }}
          >
            {value === null
              ? "未計測"
              : value.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
export function Sheet({
  visible,
  title,
  onClose,
  children,
}: PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "#0f172a88" }}>
        <View
          style={{
            maxHeight: "90%",
            width: "100%",
            maxWidth: 448,
            alignSelf: "center",
            backgroundColor: "#f0f6ff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 16,
          }}
        >
          <View style={[styles.row, { justifyContent: "space-between", marginBottom: 16 }]}>
            <Text style={styles.title}>{title}</Text>
            <Button title="閉じる" secondary onPress={onClose} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
export function Confirm({
  title,
  children,
  onConfirm,
  onCancel,
  pending,
  confirmLabel = "確定する",
}: PropsWithChildren<{
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
  confirmLabel?: string;
}>) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => !pending && onCancel()}>
      <Pressable
        accessibilityRole="none"
        onPress={() => !pending && onCancel()}
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          backgroundColor: "rgba(15,23,42,.4)",
        }}
      >
        <Pressable
          accessibilityRole="none"
          onPress={(event) => event.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 384,
            borderRadius: 24,
            padding: 24,
            backgroundColor: "white",
            boxShadow: "0 25px 50px -12px #00000040",
          }}
        >
          <Text style={[styles.title, { textAlign: "center", marginBottom: 12 }]}>{title}</Text>
          <View style={{ marginBottom: 24, gap: 8 }}>{children}</View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Button
              title="やめる"
              variant="outline"
              onPress={onCancel}
              disabled={pending}
              style={{ flex: 1, height: 44, paddingVertical: 0, justifyContent: "center" }}
              textStyle={{ fontWeight: "500" }}
            />
            <Button
              title={pending ? "処理中…" : confirmLabel}
              onPress={onConfirm}
              disabled={pending}
              style={{ flex: 1, height: 44, paddingVertical: 0, justifyContent: "center" }}
              textStyle={{ fontWeight: "500" }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
