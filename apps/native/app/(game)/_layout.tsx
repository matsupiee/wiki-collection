import { View } from "react-native";
import { BottomNav, tabs } from "../../components/bottom-nav";
import { Redirect, Stack, usePathname } from "expo-router";
import { auth } from "../../lib/client";
import { Loading } from "../../components/ui";
export default function Layout() {
  const session = auth.useSession();
  const pathname = usePathname();
  const detail =
    !tabs.some(([route]) => pathname === `/${route}`) && !pathname.startsWith("/openings/");
  if (session.isPending) return <Loading />;
  if (session.error) return <Loading error={session.error} retry={session.refetch} />;
  if (!session.data) return <Redirect href="/login" />;
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* 切り口をなぞる操作とiOSの戻るスワイプを競合させない。 */}
        <Stack.Screen
          name="openings/[openingId]/index"
          options={{ gestureEnabled: false, statusBarStyle: "light" }}
        />
      </Stack>
      {detail && <BottomNav pathname={pathname} />}
    </View>
  );
}
