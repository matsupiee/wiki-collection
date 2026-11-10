import { Redirect, Stack } from "expo-router";
import { auth } from "../../lib/client";
import { Loading } from "../../components/ui";
export default function Layout() {
  const session = auth.useSession();
  if (session.isPending) return <Loading />;
  if (session.error) return <Loading error={session.error} retry={session.refetch} />;
  if (!session.data) return <Redirect href="/login" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* 切り口をなぞる操作とiOSの戻るスワイプを競合させない。 */}
      <Stack.Screen name="openings/[openingId]/index" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
