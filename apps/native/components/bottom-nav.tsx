import { useGameSound } from "@/lib/game-sounds";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Gift, BookOpen, Store, Trophy, User } from "lucide-react-native";
import { Text } from "./typography";
export const tabs = [
  ["packs", "パック", Gift],
  ["collection", "コレクション", BookOpen],
  ["asset-ranking", "ランキング", Trophy],
  ["market", "マーケット", Store],
  ["me", "マイページ", User],
] as const;
export function BottomNav({ activeTab }: { activeTab: string }) {
  const playSound = useGameSound();
  return (
    <View
      style={{
        backgroundColor: "rgba(255,255,255,.95)",
        borderTopWidth: 1,
        borderColor: "#e2e8f0",
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 448,
          alignSelf: "center",
          flexDirection: "row",
          height: 55,
        }}
      >
        {tabs.map(([route, label, Icon]) => {
          const active = activeTab === `(${route})`;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}
              key={route}
              onPress={() => {
                playSound("tab");
                router.replace(`/${route}`);
              }}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 8,
                gap: 2,
                backgroundColor: active ? "#f0f9ff" : "transparent",
              }}
            >
              <Icon size={20} color={active ? "#0369a1" : "#64748b"} strokeWidth={2} />
              <Text
                style={{
                  fontSize: 10,
                  lineHeight: 15,
                  fontWeight: "700",
                  color: active ? "#0369a1" : "#64748b",
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
