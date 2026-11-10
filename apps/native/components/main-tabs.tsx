import { Tabs } from "expo-router";
import { BottomNav, tabs } from "./bottom-nav";
export default function MainTabs() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state }) => <BottomNav activeTab={state.routes[state.index].name} />}
    >
      {tabs.map(([name, title]) => (
        <Tabs.Screen key={name} name={`(${name})`} options={{ title }} />
      ))}
    </Tabs>
  );
}
