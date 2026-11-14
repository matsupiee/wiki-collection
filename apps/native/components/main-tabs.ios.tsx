import { locale, useTranslation } from "@/lib/i18n";
import { useGameSound } from "@/lib/game-sounds";
import { DynamicColorIOS } from "react-native";
import { router } from "expo-router";
import { NativeTabs } from "expo-router/native-tabs";
import { tabs } from "./bottom-nav";

const icons = {
  packs: { default: "gift", selected: "gift.fill" },
  collection: { default: "book", selected: "book.fill" },
  "asset-ranking": { default: "trophy", selected: "trophy.fill" },
  market: { default: "storefront", selected: "storefront.fill" },
  me: { default: "person.crop.circle", selected: "person.crop.circle.fill" },
} as const;

export default function MainTabs() {
  const t = useTranslation();
  const playSound = useGameSound();
  return (
    <NativeTabs
      key={locale}
      screenListeners={({ navigation, route }) => ({
        tabPress: (event) => {
          if (event.data.isPrevented) return;
          playSound("tab");
          if (route.name === "(me)" && navigation.isFocused()) {
            router.dismissTo("/me");
          }
        },
      })}
      tintColor={DynamicColorIOS({ light: "#0369a1", dark: "#7dd3fc" })}
      labelStyle={{ color: DynamicColorIOS({ light: "#475569", dark: "#cbd5e1" }) }}
    >
      {tabs.map(([name, title]) => (
        <NativeTabs.Trigger
          key={name}
          name={`(${name})`}
          // マイページは再選択時に上のリスナーでメニューへ戻す。
          disablePopToTop={name === "me"}
          disableAutomaticContentInsets
        >
          <NativeTabs.Trigger.Icon sf={icons[name]} />
          <NativeTabs.Trigger.Label>{t(title)}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
