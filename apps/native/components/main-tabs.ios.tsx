import { useGameSound } from "@/lib/game-sounds";
import { DynamicColorIOS } from "react-native";
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
  const playSound = useGameSound();
  return (
    <NativeTabs
      screenListeners={{ tabPress: () => playSound("tab") }}
      tintColor={DynamicColorIOS({ light: "#0369a1", dark: "#7dd3fc" })}
      labelStyle={{ color: DynamicColorIOS({ light: "#475569", dark: "#cbd5e1" }) }}
    >
      {tabs.map(([name, title]) => (
        <NativeTabs.Trigger key={name} name={`(${name})`} disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon sf={icons[name]} />
          <NativeTabs.Trigger.Label>{title}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
