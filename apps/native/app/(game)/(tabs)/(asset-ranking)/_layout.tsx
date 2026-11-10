import { Stack } from "expo-router";

export const unstable_settings = { initialRouteName: "asset-ranking" };

export default function Layout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
