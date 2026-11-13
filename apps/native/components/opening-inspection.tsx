import { useTranslation, locale } from "@/lib/i18n";
import { rarityLabels } from "@/lib/rarity";
import type { Rarity } from "@wiki-collection/db/enums";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { CardArt, type CardArtData } from "./ui";
import { Text } from "./typography";

type InspectionProps = {
  card: CardArtData & {
    rarity: Rarity;
    genreName: string;
    summary: string | null;
    monthlyPageviews: number;
  };
  isNew: boolean;
  width: number;
  height: number;
  reduced: boolean;
  index: number;
  count: number;
  select: (index: number) => void;
  close: () => void;
};
export function OpeningInspection({
  card,
  isNew,
  width,
  height,
  reduced,
  index,
  count,
  select,
  close,
}: InspectionProps) {
  const t = useTranslation();
  const zoom = useSharedValue(0);
  const cardWidth = Math.min(width * 0.656, height * 0.43);
  useEffect(() => {
    zoom.set(
      withTiming(1, { duration: reduced ? 0 : 155, easing: Easing.bezier(0.23, 1, 0.32, 1) }),
    );
    return () => cancelAnimation(zoom);
  }, [zoom, reduced]);
  const backdrop = useAnimatedStyle(() => ({ opacity: zoom.get() }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduced ? 1 : 0.95 + 0.05 * zoom.get() }],
  }));
  return (
    <View
      accessibilityViewIsModal
      onAccessibilityEscape={close}
      style={[StyleSheet.absoluteFill, { zIndex: 20 }]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, backdrop]}>
        <LinearGradient colors={["#25282d", "#191a1c"]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Pressable accessible={false} onPress={close} style={StyleSheet.absoluteFill} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("closeCard")}
        onPress={close}
        style={[styles.back, { top: height * 0.05 }]}
      >
        <Text style={styles.arrow}>‹</Text>
      </Pressable>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: (width - cardWidth) / 2,
            top: height * 0.38 - cardWidth / 2,
            width: cardWidth,
            boxShadow: "0 10px 22px #0008",
          },
          cardStyle,
        ]}
      >
        <CardArt key={index} card={card} />
      </Animated.View>
      <Animated.View
        style={[
          {
            position: "absolute",
            top: height * 0.38 + cardWidth / 2 + 8,
            width: "100%",
            alignItems: "center",
          },
          backdrop,
        ]}
      >
        <View style={styles.pager}>
          {count > 1 && (
            <Pressable
              accessibilityLabel={t("previousCard")}
              accessibilityRole="button"
              disabled={index === 0}
              style={styles.nav}
              onPress={() => select(index - 1)}
            >
              <Text style={[styles.arrow, { opacity: index === 0 ? 0.2 : 1 }]}>‹</Text>
            </Pressable>
          )}
          <Text accessibilityLiveRegion="polite" style={styles.count}>
            {index + 1} / {count}
          </Text>
          {count > 1 && (
            <Pressable
              accessibilityLabel={t("nextCard")}
              accessibilityRole="button"
              disabled={index + 1 === count}
              style={styles.nav}
              onPress={() => select(index + 1)}
            >
              <Text style={[styles.arrow, { opacity: index + 1 === count ? 0.2 : 1 }]}>›</Text>
            </Pressable>
          )}
        </View>
        <Text numberOfLines={2} style={[styles.title, { marginTop: 4 }]}>
          {card.title}
        </Text>
        <Text style={styles.caption}>
          {card.genreName} · {rarityLabels[card.rarity]}
        </Text>
        {card.summary && (
          <Text numberOfLines={3} style={styles.caption}>
            {card.summary}
          </Text>
        )}
        <Text style={styles.caption}>
          {t("viewCount", { views: card.monthlyPageviews.toLocaleString(locale) })}
        </Text>
        {isNew && <Text style={styles.newLabel}>NEW</Text>}
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  back: {
    position: "absolute",
    left: 8,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  arrow: { color: "#d9dadc", fontSize: 24 },
  pager: { flexDirection: "row", alignItems: "center" },
  count: { color: "#b8bbc0", fontSize: 12 },
  nav: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: {
    color: "#f3f4f8",
    fontSize: 16,
    fontWeight: "800",
    paddingHorizontal: 24,
    textAlign: "center",
  },
  caption: {
    color: "#b8bbc0",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 24,
    marginTop: 4,
  },
  newLabel: { color: "#ffc677", fontSize: 10, letterSpacing: 2, marginTop: 4 },
});
