import { Tabs, usePathname } from "expo-router";
import { BottomNav, tabs } from "./bottom-nav";
export default function MainTabs() {
  const pathname = usePathname();
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => <BottomNav pathname={pathname} />}>
      {tabs.map(([name, title]) => (
        <Tabs.Screen key={name} name={name} options={{ title }} />
      ))}
    </Tabs>
  );
}
