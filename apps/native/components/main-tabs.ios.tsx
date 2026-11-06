import { DynamicColorIOS } from "react-native";
import { NativeTabs } from "expo-router/native-tabs";
import { tabs } from "./bottom-nav";

const icons = {
  packs: { default: "gift", selected: "gift.fill" },
  collection: { default: "book", selected: "book.fill" },
  battle: { default: "shield", selected: "shield.fill" },
  market: { default: "storefront", selected: "storefront.fill" },
  me: { default: "person.crop.circle", selected: "person.crop.circle.fill" },
} as const;

export default function MainTabs() {
  return (
    <NativeTabs
      tintColor={DynamicColorIOS({ light: "#0369a1", dark: "#7dd3fc" })}
      labelStyle={{ color: DynamicColorIOS({ light: "#475569", dark: "#cbd5e1" }) }}
    >
      {tabs.map(([name, title]) => (
        <NativeTabs.Trigger key={name} name={name} disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon sf={icons[name]} />
          <NativeTabs.Trigger.Label>{title}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
