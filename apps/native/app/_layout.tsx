import {
  useFonts,
  MPLUSRounded1c_400Regular,
  MPLUSRounded1c_700Bold,
  MPLUSRounded1c_800ExtraBold,
  MPLUSRounded1c_900Black,
} from "@expo-google-fonts/m-plus-rounded-1c";
import { ActivityIndicator, Platform } from "react-native";
import { Stack, useSegments } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Providers } from "../lib/client";
export default function Layout() {
  const segments = useSegments();
  const nativeTabs = Platform.OS === "ios" && segments.some((segment) => segment === "(tabs)");
  const [loaded, error] = useFonts({
    MPLUSRounded1c_400Regular,
    MPLUSRounded1c_700Bold,
    MPLUSRounded1c_800ExtraBold,
    MPLUSRounded1c_900Black,
  });
  if (!loaded && !error) return <ActivityIndicator />;
  return (
    <SafeAreaProvider>
      <Providers>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: "white" }}
          edges={nativeTabs ? ["top"] : ["top", "bottom"]}
        >
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </SafeAreaView>
      </Providers>
    </SafeAreaProvider>
  );
}
